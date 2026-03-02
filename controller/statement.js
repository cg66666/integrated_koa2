/*
 * @Description: file content
 * @Author: cg
 * @Date: 2024-12-27 14:24:23
 * @LastEditors: cg
 * @LastEditTime: 2026-02-27 16:57:25
 */
// s-token 自由表单token
import koaRouter from "koa-router";
import { user_db, ticket_db, session_db, statement_db } from "../app.js";
// jwt相关配置
import jwt from "jsonwebtoken";
import handleCheckToken from "../middleware/handleCheckToken.js";
import getToken from "../middleware/getToken.js";
import logout from "../middleware/logout.js";

import secret from "../db/jwt_secret.js";

const statement_router = new koaRouter();

// 根据ticket获取token
statement_router.post(
  "/getToken",
  async (ctx, next) => {
    if (ctx.fail) return await next();
    ctx.secret = secret.statementSecret;
    ctx.tokenName = "S-TOKEN";
    await next();
  },
  getToken,
);

// 校验token
statement_router.get(
  "/checkToken",
  async (ctx, next) => {
    if (ctx.fail) return await next();
    ctx.token = ctx.header["s-token"];
    ctx.secret = secret.statementSecret;
    await next();
  },
  handleCheckToken,
);

// 获取登录用户信息
statement_router.get("/getUserInfo", async (ctx, next) => {
  if (ctx.fail) return await next();
  const token = ctx.header["s-token"];
  try {
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
    }
  } catch {
    ctx.status = 401;
    ctx.success = {
      msg: "登录信息失效！",
    };
  }
  await next();
});

// 全局退出登录
statement_router.get(
  "/logout",
  async (ctx, next) => {
    if (ctx.fail) return await next();
    ctx.tokenName = "S-TOKEN";
    ctx.secret = secret.statementSecret;
    ctx.token = ctx.header["s-token"];
    await next();
  },
  logout,
);

// 保存对应用户表格编辑内容
statement_router.post("/saveTable", async (ctx, next) => {
  if (ctx.fail) return await next();
  const { config } = ctx.request.body;
  const token = ctx.header["s-token"];
  try {
    const handleData = jwt.verify(token, secret.statementSecret);
    await statement_db.push(`/${handleData.id}`, config);
    ctx.success = {
      msg: `保存成功！`,
    };
  } catch {
    ctx.fail = {
      msg: `保存失败！`,
    };
  }
  await next();
});

export default statement_router;
