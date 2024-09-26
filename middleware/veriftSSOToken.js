/*
 * @Description: 登录注册等行为，对token的判断
 * @Author: 朱晨光
 * @Date: 2023-12-05 09:31:11
 * @LastEditors: cg
 * @LastEditTime: 2024-09-19 17:38:11
 */
import jwt from "jsonwebtoken";
import secret from "../db/jwt_secret.js";
import { loginToken_db } from "../app.js";

export default async (ctx, next) => {
  const loginingToken = ctx.header["login-token"];
  if (!loginingToken) {
    ctx.fail = {
      msg: `登录toen无效！`,
    };
  } else {
    try {
      const handleToken = jwt.verify(loginingToken, secret.loginingSecret);
      if (!(await loginToken_db.exists(`/${handleToken.tokenUniqueId}`))) {
        ctx.fail = {
          msg: `登录toen无效！`,
        };
      }
    } catch {
      ctx.fail = {
        msg: `登录toen无效！`,
      };
    }
  }

  // 将token失效
  const decryptToken = jwt.verify(loginingToken, secret.loginingSecret);
  loginToken_db.delete(`/${decryptToken.tokenUniqueId}`);

  await next();
};
