/*
 * @Description: 测试
 * @Author: 朱晨光
 * @Date: 2023-12-02 21:16:00
 * @LastEditors: cg
 * @LastEditTime: 2026-02-27 16:56:03
 */
// t-token markdown页token
import koaRouter from "koa-router";
import { user_db, ticket_db, session_db, tiptap_db } from "../app.js";
// jwt相关配置
import jwt from "jsonwebtoken";
import getToken from "../middleware/getToken.js";

import handleCheckToken from "../middleware/handleCheckToken.js";
import logout from "../middleware/logout.js";

import secret from "../db/jwt_secret.js";
const tiptap_router = new koaRouter();

// 根据ticket获取token
tiptap_router.post(
  "/getToken",
  async (ctx, next) => {
    if (ctx.fail) return await next();
    ctx.secret = secret.tiptapSecret;
    ctx.tokenName = "T-TOKEN";
    await next();
  },
  getToken,
);

// 校验token
tiptap_router.get(
  "/checkToken",
  async (ctx, next) => {
    if (ctx.fail) return await next();
    ctx.token = ctx.header["t-token"];
    ctx.secret = secret.tiptapSecret;
    await next();
  },
  handleCheckToken,
);

// 获取登录用户信息
tiptap_router.get("/getUserInfo", async (ctx, next) => {
  if (ctx.fail) return await next();
  const token = ctx.header["t-token"];
  try {
    const handleData = jwt.verify(token, secret.tiptapSecret);
    if (await user_db.exists(`/${handleData.id}`)) {
      const data = await user_db.getData(`/${handleData.id}`);
      ctx.success = {
        msg: "success",
        data: {
          name: data.userName,
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
tiptap_router.get(
  "/logout",
  async (ctx, next) => {
    if (ctx.fail) return await next();
    ctx.tokenName = "T-TOKEN";
    ctx.secret = secret.tiptapSecret;
    ctx.token = ctx.header["t-token"];
    await next();
  },
  logout,
);

tiptap_router.post("/saveData", async (ctx, next) => {
  if (ctx.fail) return await next();
  const { data } = ctx.request.body;
  try {
    await tiptap_db.push("/data", data);
    ctx.success = {
      msg: "保存成功",
    };
  } catch {
    ctx.success = {
      msg: "保存失败",
    };
  }
  await next();
});

// tiptap_router.get("/getData", async (ctx, next) => {
//   if (ctx.fail) return await next();
//   const { data } = ctx.request.body;
//   try {
//     const data = await tiptap_db.getData("/data");
//     ctx.success = {
//       msg: "保存成功",
//       data
//     };
//   } catch {
//     ctx.fail = {
//       msg: "获取失败",
//     };
//   }
//   await next();
// });

tiptap_router.get("/getData", async (ctx, next) => {
  if (ctx.fail) return await next();
  try {
    const data = await tiptap_db.getData("/data");
    ctx.success = {
      data,
    };
  } catch {
    ctx.fail = {
      msg: "获取失败",
    };
  }
  await next();
});

// console.log("inner", router_login.routes);
export default tiptap_router;
