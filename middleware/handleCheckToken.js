/*
 * @Description: 结果返回处理中间件
 * @Author: 朱晨光
 * @Date: 2023-12-02 21:21:12
 * @LastEditors: cg
 * @LastEditTime: 2026-03-02 02:33:15
 */
import jwt from "jsonwebtoken";
import { user_db, ticket_db, session_db } from "../app.js";

export default async (ctx, next) => {
  if (ctx.fail) return await next();
  console.log("token", ctx.token);
  const { token, secret } = ctx;
  if (!token) {
    ctx.status = 401;
    ctx.success = {
      msg: "登录信息失效！",
    };
  } else {
    try {
      const handleData = jwt.verify(token, secret);
      if (await session_db.exists(`/${handleData.id}`)) {
        const sessionData = await session_db.getData(`/${handleData.id}`);
        if (sessionData.expireTime >= Date.now()) {
          // 更新时间
          session_db.push(`/${handleData.id}`, {
            expireTime: Date.now() + 1 * 60 * 60 * 1000,
          });
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
        ctx.status = 401;
        ctx.success = {
          msg: "登录信息失效！",
        };
      }
    } catch (error) {
      ctx.success = {
        data: {
          ok: false,
        },
      };
    }
  }

  await next();
};
