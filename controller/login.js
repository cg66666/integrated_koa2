/*
 * @Description: 测试
 * @Author: 朱晨光
 * @Date: 2023-12-02 21:16:00
 * @LastEditors: cg
 * @LastEditTime: 2024-09-18 13:53:49
 */
import { user_db } from "../app.js";
import koaRouter from "koa-router";
const router_login = new koaRouter();

router_login.post("/register", async (ctx, next) => {
  const { registerInfo } = ctx.request.body;
  registerInfo.createTime = new Date();
  await user_db.push(`/${registerInfo.name}`, registerInfo);
  ctx.success = {
    msg: `注册成功`,
  };
  await next();
});

// console.log("inner", router_login.routes);
export default router_login;
