/*
 * @Description: 结果返回处理中间件
 * @Author: 朱晨光
 * @Date: 2023-12-02 21:21:12
 * @LastEditors: cg
 * @LastEditTime: 2026-02-27 15:46:48
 */
import jwt from "jsonwebtoken";
import { user_db, ticket_db, session_db } from "../app.js";

export default async (ctx, next) => {
  const { tokenName, secret, token } = ctx;
  if (!token) {
    ctx.success = {
      msg: "退出登陆成功！",
    };
  } else {
    try {
      const handleData = jwt.verify(token, secret);
      await session_db.delete(`/${handleData.id}`);
      ctx.success = {
        msg: "退出登陆成功！",
      };
    } catch {}
    // 清空名cookie
    ctx.cookies.set(tokenName, "", {
      // 设置过期时间为过去的一个时间点，这会让浏览器立即删除这个 cookie
      expires: new Date(1), // 或者使用 maxAge: -1
      overwrite: true,
      httpOnly: false,
    });
  }
  await next();
};
