/*
 * @Description: 登录、注册
 * @Author: 朱晨光
 * @Date: 2023-12-05 09:03:42
 * @LastEditors: cg
 * @LastEditTime: 2025-01-05 04:50:27
 */
import Dysmsapi20170525 from "@alicloud/dysmsapi20170525";
import OpenApi from "@alicloud/openapi-client";
import Util from "@alicloud/tea-util";
import Console from "@alicloud/tea-console";
import {
  user_db,
  accountId_db,
  // loginToken_db,
  loggerSSO,
  ticket_db,
  session_db,
} from "../app.js";
import svgCaptcha from "svg-captcha";
import { nanoid } from "nanoid";
import veriftSSOToken from "../middleware/veriftSSOToken.js";

// jwt相关配置
import jwt from "jsonwebtoken";
import secret from "../db/jwt_secret.js";
const jwt_expiresIn = 60 * 60;

import koaRouter from "koa-router";
const SSO_router = new koaRouter();

// const produceToken = async () => {
//   // 生成登录token
//   let tokenUniqueId = nanoid(32);
//   while (await loginToken_db.exists(`/${tokenUniqueId}`)) {
//     tokenUniqueId = nanoid(32);
//   }
//   loginToken_db.push(`/${tokenUniqueId}`, true);
//   return tokenUniqueId;
// };

// 获取登录状态中的临时token （token失效不影响）
SSO_router.post("/getLogingToken", async (ctx, next) => {
  if (ctx.fail) return await next();
  const ssoToken = ctx.cookies.get("SSO-TOKEN");
  // console.log("ssoToken", ssoToken);
  let { redirectUrl, prevToken } = ctx.request.body;
  // 判断状态（是否为登录状态）
  if (ssoToken) {
    //如果保持登录状态，则无感延长登陆时间
    const handleToken = jwt.verify(ssoToken, secret.userSecret);
    if (await session_db.exists(`/${handleToken.id}`)) {
      const sessionData = await session_db.getData(`/${handleToken.id}`);
      // 判断是否过期
      if (sessionData.expireTime >= Date.now()) {
        const expireTime = Date.now() + 1 * 60 * 60 * 1000;
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
        // const tokenUniqueId = await produceToken();
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
          { redirectUrl, verificationCode: captcha.text },
          secret.loginingSecret
        );
        ctx.type = "image/svg+xml"; // 设置 Content-Type 为 SVG
        ctx.success = {
          data: { loginingToken, svg: captcha.data },
        };
      }
    } else {
      ctx.cookies.set("SSO-TOKEN", "", { maxAge: -1000 });
      // const tokenUniqueId = await produceToken();
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
        { redirectUrl, verificationCode: captcha.text },
        secret.loginingSecret
      );
      ctx.type = "image/svg+xml"; // 设置 Content-Type 为 SVG
      ctx.success = {
        data: { loginingToken, svg: captcha.data },
      };
    }
  } else {
    // let prevTokenUniqueId;
    // redirectUrl参数优先于prevToken，此时需要取出旧token中的redirectUrl，如果token过期，redirectUrl将丢失
    if (prevToken) {
      const decryptToken = jwt.verify(prevToken, secret.loginingSecret);
      if (!redirectUrl) {
        redirectUrl = decryptToken.redirectUrl;
      }
      // 删除旧token
      // prevTokenUniqueId = decryptToken.tokenUniqueId;
      // if (await loginToken_db.exists(`/${prevTokenUniqueId}`)) {
      //   loginToken_db.delete(`/${prevTokenUniqueId}`);
      // }
    }

    // const tokenUniqueId = await produceToken();

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
    // 生成登录token，无过期时间
    const loginingToken = jwt.sign(
      { redirectUrl, verificationCode: captcha.text },
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
    const decryptToken = ctx.decryptToken;

    const { userName, account, password, verificationCode } = ctx.request.body;

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
          const createTime = Date.now();
          let uniqueId = nanoid(32);
          while (await user_db.exists(`/${account}`)) {
            uniqueId = nanoid(32);
          }
          await accountId_db.push(`/${account}`, uniqueId);
          // const uniqueId2 = nanoid();
          const insertData = {
            userName,
            createTime,
            account,
            password,
          };
          await user_db.push(`/${uniqueId}`, insertData);
          let token = jwt.sign({ id: uniqueId }, secret.userSecret, {
            expiresIn: jwt_expiresIn,
          });

          // 设置过期时间
          const expireTime = Date.now() + 5 * 60 * 60 * 1000;

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

          // 删除库中的登录token
          // await loginToken_db.delete(`/${loginingToken}`);

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
    const decryptToken = ctx.decryptToken;

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
          const expireTime = Date.now() + 1 * 60 * 60 * 1000;

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

// 发送验证码
SSO_router.get("/phone/postCaptcha", veriftSSOToken, async (ctx, next) => {
  if (ctx.fail) return await next();
  const phone = ctx.query.phone;
  console.log("decryptToken", ctx.decryptToken);

  if (!phone) {
    ctx.fail = {
      msg: `传参缺失！`,
    };
  } else {
    const decryptToken = ctx.decryptToken;
    const redirectUrl = decryptToken.redirectUrl;
    // const tokenUniqueId = await produceToken();
    // 生成登录token，无过期时间
    const randomNumber =
      Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000;
    console.log(`randomNumber：${randomNumber}`);
    const loginingToken = jwt.sign(
      {
        phone,
        redirectUrl,
        verificationCode: randomNumber,
        expireTime: Date.now() + 1 * 60 * 1000,
      },
      secret.loginingSecret
    );

    let config = new OpenApi.Config({
      // 必填，请确保代码运行环境设置了环境变量 ALIBABA_CLOUD_KEY
      accessKeyId: process.env["ALIBABA_CLOUD_KEY"],
      // 必填，请确保代码运行环境设置了环境变量 ALIBABA_CLOUD_SECRET
      accessKeySecret: process.env["ALIBABA_CLOUD_SECRET"],
      // Endpoint 请参考 https://api.aliyun.com/product/Dysmsapi
      endpoint: `dysmsapi.aliyuncs.com`,
    });

    let client = new Dysmsapi20170525.default(config);

    let sendSmsRequest = new Dysmsapi20170525.SendSmsRequest({
      signName: "cg登录",
      templateCode: "SMS_474975229",
      phoneNumbers: phone,
      templateParam: `{"code":"${randomNumber}"}`,
    });
    let runtime = new Util.RuntimeOptions({});
    // ctx.success = {
    //   data: {
    //     loginingToken,
    //   },
    // };
    try {
      let resp = await client.sendSmsWithOptions(sendSmsRequest, runtime);
      loggerSSO.info({
        msg: "发送短信验证码",
        phone,
      });
      console.log("resp", resp.body.code);
      if (resp.body.code === "isv.BUSINESS_LIMIT_CONTROL") {
        console.log(111);

        ctx.fail = {
          msg: `此手机号，当天或当前小时内发送次数达上限！`,
        };
      } else {
        Console.default.log(Util.default.toJSONString(resp));
        ctx.success = {
          data: {
            loginingToken,
          },
        };
      }
    } catch (error) {
      // 错误 message
      console.log(111, error.message);
      // 诊断地址
      console.log(222, error.data["Recommend"]);
      Util.default.assertAsString(333, error.message);
    }
  }

  await next();
});

// 手机登录或注册
SSO_router.post("/phone/login", veriftSSOToken, async (ctx, next) => {
  if (ctx.fail) return await next();
  const decryptToken = ctx.decryptToken;
  const { phone, verificationCode } = ctx.request.body;
  // 参数校验
  if (!phone || !verificationCode) {
    ctx.fail = {
      msg: `传参缺失！`,
    };
  } else {
    // 手机号校验
    if (phone !== decryptToken.phone) {
      // loginToken_db.push(`/${decryptToken.tokenUniqueId}`, true);
      ctx.fail = {
        msg: `手机号错误`,
      };
      return await next();
    }

    // 验证码失效判断
    if (Date.now() > decryptToken.expireTime) {
      // loginToken_db.push(`/${decryptToken.tokenUniqueId}`, true);
      ctx.fail = {
        msg: `验证码已失效！`,
      };
      return await next();
    }
    if (verificationCode.toLowerCase() != decryptToken.verificationCode) {
      // loginToken_db.push(`/${decryptToken.tokenUniqueId}`, true);
      ctx.fail = {
        msg: `验证码错误！`,
      };
      return await next();
    }
    let token;
    let uniqueId;
    // 手机号查询，是否自动注册
    if (await accountId_db.exists(`/${phone}`)) {
      // 查询该账户的id
      uniqueId = await accountId_db.getData(`/${phone}`);
      token = jwt.sign({ id: uniqueId }, secret.userSecret, {
        expiresIn: jwt_expiresIn,
      });
    } else {
      const createTime = Date.now();
      uniqueId = nanoid(32);
      while (await user_db.exists(`/${uniqueId}`)) {
        uniqueId = nanoid(32);
      }
      await accountId_db.push(`/${phone}`, uniqueId);
      const name = phone.slice(8, 11);
      const insertData = {
        userName: `${name}用户`,
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
    const expireTime = Date.now() + 1 * 60 * 60 * 1000;
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
});

export default SSO_router;
