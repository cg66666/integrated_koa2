/*
 * @Description: 登录注册等行为，对token的判断
 * @Author: 朱晨光
 * @Date: 2023-12-05 09:31:11
 * @LastEditors: cg
 * @LastEditTime: 2024-12-27 13:52:30
 */
import jwt from "jsonwebtoken";
import secret from "../db/jwt_secret.js";
// import { loginToken_db } from "../app.js";

export default async (ctx, next) => {
  const loginingToken = ctx.header["login-token"];
  if (!loginingToken) {
    ctx.fail = {
      msg: `登录toen无效！请重新刷新页面！`,
    };
  } else {
    try {
      // 中间件进行解析token
      const handleToken = jwt.verify(loginingToken, secret.loginingSecret);
      // if (!(await loginToken_db.exists(`/${handleToken.tokenUniqueId}`))) {
      //   ctx.fail = {
      //     msg: `登录toen无效！请重新刷新页面！`,
      //   };
      // } else {
      ctx.decryptToken = handleToken;
      // }
    } catch {
      ctx.fail = {
        msg: `登录toen无效！请重新刷新页面！`,
      };
    }
  }

  // 将token失效
  const decryptToken = jwt.verify(loginingToken, secret.loginingSecret);
  // loginToken_db.delete(`/${decryptToken.tokenUniqueId}`);

  await next();
};
