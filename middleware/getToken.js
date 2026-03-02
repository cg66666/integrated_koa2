/*
 * @Description: 结果返回处理中间件
 * @Author: 朱晨光
 * @Date: 2023-12-02 21:21:12
 * @LastEditors: cg
 * @LastEditTime: 2026-02-27 16:51:14
 */
import jwt from "jsonwebtoken";
import { user_db, ticket_db, session_db } from "../app.js";

export default async (ctx, next) => {
  if (ctx.fail) return await next();

  const { tokenName, secret } = ctx;

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
        secret,
      );

      ctx.cookies.set(tokenName, token, {
        overwrite: true,
        httpOnly: false,
      });
      ctx.success = {
        msg: "登陆成功",
      };
    }
    // 解决开发模式问题
    setTimeout(() => {
      // 删除对应ticket
      ticket_db.delete(`/${ticket}`);
    }, 1000);
  } else {
    ctx.status = 401;
    ctx.success = {
      msg: "登录信息失效！",
    };
  }
  await next();
};
