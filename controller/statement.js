/*
 * @Description: file content
 * @Author: cg
 * @Date: 2024-12-27 14:24:23
 * @LastEditors: cg
 * @LastEditTime: 2025-01-07 17:51:28
 */
// s-token 自由表单token
import koaRouter from "koa-router";
import { user_db, ticket_db, session_db, statement_db } from "../app.js";
// jwt相关配置
import jwt from "jsonwebtoken";

import secret from "../db/jwt_secret.js";

const statement_router = new koaRouter();

// 根据ticket获取token
statement_router.post("/getToken", async (ctx, next) => {
  if (ctx.fail) return await next();
  const { ticket } = ctx.request.body;
  if (!ticket) {
    ctx.fail = {
      msg: "参数缺失！",
    };
  } else if (await ticket_db.exists(`/${ticket}`)) {
    let data = await ticket_db.getData(`/${ticket}`);
    if (data.expireTime < Date.now()) {
      ctx.status = 401;
      ctx.success = {
        msg: "登录信息失效！",
      };
    } else {
      const token = jwt.sign(
        { id: data.id, expireTime: data.expireTime },
        secret.statementSecret
      );

      ctx.cookies.set("S-TOKEN", token, {
        overwrite: true,
        httpOnly: false,
      });
      ctx.success = {
        msg: "登陆成功",
      };
    }
    // 删除对应ticket
    await ticket_db.delete(`/${ticket}`);
  } else {
    ctx.status = 401;
    ctx.success = {
      msg: "登录信息失效！",
    };
  }

  await next();
});

// 校验token
statement_router.get("/checkToken", async (ctx, next) => {
  if (ctx.fail) return await next();
  const token = ctx.header["s-token"];

  if (!token) {
    ctx.status = 401;
    ctx.success = {
      msg: "登录信息失效！",
    };
  } else {
    const handleData = jwt.verify(token, secret.statementSecret);
    if (await session_db.exists(`/${handleData.id}`)) {
      const sessionData = await session_db.getData(`/${handleData.id}`);
      if (sessionData.expireTime >= Date.now()) {
        ctx.success = {
          data: {
            ok: true,
          },
        };
      } else {
        ctx.status = 401;
        ctx.success = {
          msg: "登录信息失效！",
        };
      }
    } else {
      ctx.success = {
        data: {
          ok: false,
        },
      };
    }
  }
  await next();
});

// 获取登录用户信息
statement_router.get("/getUserInfo", async (ctx, next) => {
  if (ctx.fail) return await next();
  const token = ctx.header["s-token"];
  const handleData = jwt.verify(token, secret.statementSecret);

  if (await user_db.exists(`/${handleData.id}`)) {
    const data = await user_db.getData(`/${handleData.id}`);
    // console.log(111, data);
    let config = null;
    if (await statement_db.exists(`/${handleData.id}`)) {
      config = await statement_db.getData(`/${handleData.id}`);
    }
    ctx.success = {
      msg: "success",
      data: {
        name: data.userName,
        config,
      },
    };
  } else {
    ctx.status = 401;
    ctx.success = {
      msg: "登录信息失效！",
    };
  }
  await next();
});

// 全局退出登录
statement_router.get("/logout", async (ctx, next) => {
  if (ctx.fail) return await next();
  const token = ctx.header["s-token"];
  if (!token) {
    ctx.success = {
      msg: "退出登陆成功！",
    };
  } else {
    const handleData = jwt.verify(token, secret.statementSecret);
    await session_db.delete(`/${handleData.id}`);
    ctx.success = {
      msg: "退出登陆成功！",
    };

    // 清空名cookie
    ctx.cookies.set("S-TOKEN", "", {
      // 设置过期时间为过去的一个时间点，这会让浏览器立即删除这个 cookie
      expires: new Date(1), // 或者使用 maxAge: -1
      overwrite: true,
      httpOnly: false,
    });
    
  }
  await next();
});

// 保存对应用户表格编辑内容
statement_router.post("/saveTable", async (ctx, next) => {
  if (ctx.fail) return await next();
  const { config } = ctx.request.body;
  const token = ctx.header["s-token"];
  const handleData = jwt.verify(token, secret.statementSecret);
  await statement_db.push(`/${handleData.id}`, config);
  ctx.success = {
    msg: `保存成功！`,
  };
  await next();
});

export default statement_router;
