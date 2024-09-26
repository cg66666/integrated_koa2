/*
 * @Description: 登录、注册
 * @Author: 朱晨光
 * @Date: 2023-12-05 09:03:42
 * @LastEditors: cg
 * @LastEditTime: 2024-09-25 14:04:23
 */

import {
  user_db,
  accountId_db,
  loginToken_db,
  loggerSSO,
  ticket_db,
  session_db,
} from "../app.js";
import svgCaptcha from "svg-captcha";
import { nanoid } from "nanoid";
// const setLoginHistory = require("../middleware/setLoginHistory");
import veriftSSOToken from "../middleware/veriftSSOToken.js";

// jwt相关配置
import jwt from "jsonwebtoken";
import secret from "../db/jwt_secret.js";
const jwt_expiresIn = 60 * 60;

import koaRouter from "koa-router";
const SSO_router = new koaRouter();

// 获取登录状态中的临时token （token失效不影响）
SSO_router.post("/getLogingToken", async (ctx, next) => {
  const ssoToken = ctx.cookies.get("SSO-TOKEN");
  // console.log("ssoToken", ssoToken);
  let { redirectUrl, prevToken } = ctx.request.body;
  // 判断状态
  if (ssoToken) {
    //如果保持登录状态，则无感延长登陆时间
    const handleToken = jwt.verify(ssoToken, secret.userSecret);
    if (session_db.exists(`/${handleToken.id}`)) {
      const sessionData = await session_db.getData(`/${handleToken.id}`);
      // 判断是否过期
      if (sessionData.expireTime >= new Date().getTime()) {
        const expireTime = new Date().getTime() + 1 * 60 * 60 * 1000;
        console.log("sessionData", sessionData);
        session_db.push(`/${handleToken.id}`, { expireTime });
        let token = jwt.sign({ id: handleToken.id }, secret.userSecret);
        ctx.cookies.set("SSO-TOKEN", token, {
          overwrite: true,
          httpOnly: true,
          sameSite: "strict",
        });

        // 生成登录token
        let ticket = nanoid(12);
        while (await ticket_db.exists(`/${ticket}`)) {
          ticket = nanoid(12);
        }
        ticket_db.push(`/${ticket}`, { id: handleToken.id, expireTime });

        ctx.success = {
          msg: `登录成功`,
          data: {
            // token,
            id: handleToken.id,
            url: redirectUrl,
            ticket,
          },
        };
        loggerSSO.info({
          msg: "登录成功",
          id: handleToken.id,
          url: redirectUrl,
          ticket,
        });
      } else {
        session_db.delete(`/${handleToken.id}`);
        ctx.cookies.set("SSO-TOKEN", "", { maxAge: -1000 });
      }
    } else {
      // 应该没有这种场景
    }
  } else {
    let prevTokenUniqueId;
    // redirectUrl参数优先于prevToken，此时需要取出旧token中的redirectUrl，如果token过期，redirectUrl将丢失
    if (prevToken) {
      const decryptToken = jwt.verify(prevToken, secret.loginingSecret);
      if (!redirectUrl) {
        redirectUrl = decryptToken.redirectUrl;
      }
      // 删除旧token
      prevTokenUniqueId = decryptToken.tokenUniqueId;
      if (await loginToken_db.exists(`/${prevTokenUniqueId}`)) {
        loginToken_db.delete(`/${prevTokenUniqueId}`);
      }
    }

    // 生成登录token
    let tokenUniqueId = nanoid(32);
    while (await loginToken_db.exists(`/${tokenUniqueId}`)) {
      tokenUniqueId = nanoid(32);
    }
    loginToken_db.push(`/${tokenUniqueId}`, true);

    // 生成验证码
    const captcha = svgCaptcha.create({
      size: 4, // 验证码长度
      ignoreChars: "0o", // 验证码字符中排除 0o1i
      noise: 6, // 干扰线条的数量
      color: true, // 验证码字符是否有颜色，默认是 true
      // backgroundColor: "#cc9966", // 背景颜色
      width: 180,
      height: 55,
    });
    const loginingToken = jwt.sign(
      { redirectUrl, verificationCode: captcha.text, tokenUniqueId },
      secret.loginingSecret
    );
    ctx.type = "image/svg+xml"; // 设置 Content-Type 为 SVG
    ctx.success = {
      data: { loginingToken, svg: captcha.data },
    };
  }
  await next();
});

// 注册
SSO_router.post(
  "/register",
  veriftSSOToken,
  async (ctx, next) => {
    if (ctx.fail) return await next();
    const loginingToken = ctx.header["login-token"];
    const decryptToken = jwt.verify(loginingToken, secret.loginingSecret);

    const { account, password, verificationCode } = ctx.request.body;

    // 参数校验
    if (!account || !password || !verificationCode) {
      ctx.fail = {
        msg: `传参缺失！`,
      };
    } else {
      // 验证码校验 小写化校验
      if (
        verificationCode.toLowerCase() !==
        decryptToken.verificationCode.toLowerCase()
      ) {
        ctx.fail = {
          msg: `验证码错误！`,
        };
      } else {
        // 账号密码校验
        if (!(await accountId_db.exists(`/${account}`))) {
          const createTime = new Date().getTime();
          let uniqueId = nanoid(32);
          while (await user_db.exists(`/${account}`)) {
            uniqueId = nanoid(32);
          }
          await accountId_db.push(`/${account}`, uniqueId);
          const uniqueId2 = nanoid();
          const insertData = {
            userName: `用户${uniqueId2}`,
            createTime,
            account,
            password,
          };
          await user_db.push(`/${uniqueId}`, insertData);
          let token = jwt.sign({ id: uniqueId }, secret.userSecret, {
            expiresIn: jwt_expiresIn,
          });

          // 设置过期时间
          const expireTime = new Date().getTime() + 1 * 60 * 60 * 1000;

          session_db.push(`/${uniqueId}`, { expireTime });

          ctx.cookies.set("SSO-TOKEN", token, {
            overwrite: true,
            httpOnly: true,
            sameSite: "strict",
          });

          // 生成登录token
          let ticket = nanoid(12);
          while (await ticket_db.exists(`/${ticket}`)) {
            ticket = nanoid(12);
          }
          ticket_db.push(`/${ticket}`, { id: uniqueId, expireTime });

          ctx.success = {
            msg: `注册成功`,
            data: {
              // token,
              id: uniqueId,
              url: decryptToken.redirectUrl,
              ticket,
            },
          };
          loggerSSO.info({
            msg: "注册成功",
            id: uniqueId,
            url: decryptToken.redirectUrl,
            ticket,
          });
        } else {
          ctx.fail = {
            msg: `注册失败，该账号名已存在`,
          };
        }
      }
    }
    await next();
  }
  // setLoginHistory
);

// 登录
SSO_router.post(
  "/login",
  veriftSSOToken,
  async (ctx, next) => {
    if (ctx.fail) return await next();
    const loginingToken = ctx.header["login-token"];
    const decryptToken = jwt.verify(loginingToken, secret.loginingSecret);

    const { account, password, verificationCode } = ctx.request.body;
    // 参数校验
    if (!account || !password || !verificationCode) {
      ctx.fail = {
        msg: `传参缺失！`,
      };
    } else {
      // 验证码校验 小写化校验
      if (
        verificationCode.toLowerCase() !==
        decryptToken.verificationCode.toLowerCase()
      ) {
        ctx.fail = {
          msg: `验证码错误！`,
        };
        return await next();
      }

      // 账号密码校验
      if (await accountId_db.exists(`/${account}`)) {
        // 查询该账户的id
        const uniqueId = await accountId_db.getData(`/${account}`);
        const userInfo = await user_db.getData(`/${uniqueId}`);
        if (userInfo.password === password) {
          let token = jwt.sign({ id: uniqueId }, secret.userSecret, {
            expiresIn: jwt_expiresIn,
          });

          // 设置过期时间
          const expireTime = new Date().getTime() + 1 * 60 * 60 * 1000;

          session_db.push(`/${uniqueId}`, { expireTime });

          ctx.cookies.set("SSO-TOKEN", token, {
            overwrite: true,
            httpOnly: true,
            sameSite: "strict",
          });

          // 生成登录token
          let ticket = nanoid(12);
          while (await ticket_db.exists(`/${ticket}`)) {
            ticket = nanoid(12);
          }
          ticket_db.push(`/${ticket}`, { id: uniqueId, expireTime });

          ctx.success = {
            msg: `登录成功`,
            data: {
              // token,
              id: uniqueId,
              url: decryptToken.redirectUrl,
              ticket,
            },
          };
          loggerSSO.info({
            msg: "登录成功",
            id: uniqueId,
            url: decryptToken.redirectUrl,
            ticket,
          });
        } else {
          ctx.fail = {
            msg: `登陆失败，账号名或密码错误`,
          };
        }
      } else {
        ctx.fail = {
          msg: `登陆失败，账号名或密码错误`,
        };
      }
    }
    await next();
  }
  // setLoginHistory
);

// 手机登录或注册
SSO_router.post(
  "/phone/login",
  veriftSSOToken,
  async (ctx, next) => {
    if (ctx.fail) return await next();
    const loginingToken = ctx.header["login-token"];
    const decryptToken = jwt.verify(loginingToken, secret.loginingSecret);

    const { phone, verificationCode } = ctx.request.body;
    // 参数校验
    if (!phone || !verificationCode) {
      ctx.fail = {
        msg: `传参缺失！`,
      };
    } else {
      // 验证码校验 小写化校验 目前验证码写死12345
      if (verificationCode.toLowerCase() !== "12345") {
        ctx.fail = {
          msg: `验证码错误！`,
        };
        return await next();
      }
      let token;

      // 手机号查询，是否自动注册
      if (await accountId_db.exists(`/${phone}`)) {
        // 查询该账户的id
        const uniqueId = await accountId_db.getData(`/${phone}`);
        token = jwt.sign({ id: uniqueId }, secret.userSecret, {
          expiresIn: jwt_expiresIn,
        });
      } else {
        const createTime = new Date().getTime();
        let uniqueId = nanoid(32);

        while (await user_db.exists(`/${uniqueId}`)) {
          uniqueId = nanoid(32);
        }

        await accountId_db.push(`/${phone}`, uniqueId);
        const uniqueId2 = nanoid();
        const insertData = {
          userName: `用户${uniqueId2}`,
          createTime,
          account: phone,
          phone,
        };
        await user_db.push(`/${uniqueId}`, insertData);
        token = jwt.sign({ id: uniqueId }, secret.userSecret, {
          expiresIn: jwt_expiresIn,
        });
      }

      // 设置过期时间
      const expireTime = new Date().getTime() + 1 * 60 * 60 * 1000;

      session_db.push(`/${uniqueId}`, { expireTime });

      ctx.cookies.set("SSO-TOKEN", token, {
        overwrite: true,
        httpOnly: true,
        sameSite: "strict",
      });

      // 生成登录token
      let ticket = nanoid(12);
      while (await ticket_db.exists(`/${ticket}`)) {
        ticket = nanoid(12);
      }
      ticket_db.push(`/${ticket}`, { id: uniqueId, expireTime });

      ctx.success = {
        msg: `登录成功`,
        data: {
          // token,
          id: uniqueId,
          url: decryptToken.redirectUrl,
          ticket,
        },
      };
      loggerSSO.info({
        msg: "登录成功",
        id: uniqueId,
        url: decryptToken.redirectUrl,
        ticket,
      });
    }
    await next();
  }
  // setLoginHistory
);

// 退出登录
SSO_router.get("/logout", async (ctx, next) => {
  console.log("query", ctx.query.id);
  if (!ctx.query.id) {
    ctx.fail = {
      msg: "参数缺失！",
    };
  } else if (await session_db.exists(`/${ctx.query.id}`)) {
    session_db.delete(`/${ctx.query.id}`);
    ctx.cookies.set("SSO-TOKEN", "", { maxAge: -1000 });
  }
  await next();
});

// 获取平台用户id
SSO_router.get("/getUserId", async (ctx, next) => {
  console.log("query", ctx.query.ticket);
  if (!ctx.query.ticket) {
    ctx.fail = {
      msg: "参数缺失！",
    };
  } else if (await ticket_db.exists(`/${ctx.query.ticket}`)) {
    let data = await ticket_db.getData(`/${ctx.query.ticket}`);
    ticket_db.delete(`/${ctx.query.ticket}`);
    ctx.success = {
      data: {
        id: data.id,
        expireTime: data.expireTime,
      },
    };
  }
  await next();
});

// 校验token是否有效
SSO_router.get("/checkSession", async (ctx, next) => {
  console.log("query", ctx.query.id);
  if (!ctx.query.id) {
    ctx.fail = {
      msg: "参数缺失！",
    };
  } else if (await session_db.exists(`/${ctx.query.id}`)) {
    const sessionData = await session_db.getData(`/${ctx.query.id}`);
    if (sessionData.expireTime >= new Date().getTime()) {
      ctx.success = {
        data: {
          isValidate: true,
        },
      };
    } else {
      ctx.success = {
        data: {
          isValidate: false,
        },
      };
    }
  } else {
    ctx.success = {
      data: {
        isValidate: false,
      },
    };
  }
  await next();
});

// 获取用户基本信息
SSO_router.get("/getUserInfo", async (ctx, next) => {
  // console.log("ctx", ctx);
  // const token = ctx.header["x-token"];
  // console.log("token", token);
  // const decryptToken = jwt.verify(userToken, secret.userSecret);
  // if(decryptToken.id && ){
  // }else{
  // }
  // ctx.success = {
  //   aa: 1,
  // };
  // await next();
});

export default SSO_router;
