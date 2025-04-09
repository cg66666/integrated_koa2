/*
 * @Description: 测试
 * @Author: 朱晨光
 * @Date: 2023-12-02 21:16:00
 * @LastEditors: cg
 * @LastEditTime: 2025-04-09 18:47:15
 */
// t-token markdown页token
import koaRouter from "koa-router";
import { user_db, ticket_db, session_db, tiptap_db } from "../app.js";
// jwt相关配置
import jwt from "jsonwebtoken";

import secret from "../db/jwt_secret.js";
const tiptap_router = new koaRouter();

// 根据ticket获取token
tiptap_router.post("/getToken", async (ctx, next) => {
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
        secret.tiptapSecret
      );

      ctx.cookies.set("T-TOKEN", token, {
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
});

// 校验token
tiptap_router.get("/checkToken", async (ctx, next) => {
  if (ctx.fail) return await next();
  const token = ctx.header["t-token"];
  if (!token) {
    ctx.status = 401;
    ctx.success = {
      msg: "登录信息失效！",
    };
  } else {
    try {
      const handleData = jwt.verify(token, secret.tiptapSecret);
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
        ctx.status = 401;
        ctx.success = {
          msg: "登录信息失效！",
        };
      }
    } catch {
      console.log(444, ctx.fail);

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
tiptap_router.get("/logout", async (ctx, next) => {
  if (ctx.fail) return await next();
  const token = ctx.header["s-token"];
  if (!token) {
    ctx.success = {
      msg: "退出登陆成功！",
    };
  } else {
    try {
      const handleData = jwt.verify(token, secret.tiptapSecret);
      await session_db.delete(`/${handleData.id}`);
    } catch {}
    ctx.success = {
      msg: "退出登陆成功！",
    };
    // 清空名cookie
    ctx.cookies.set("T-TOKEN", "", {
      // 设置过期时间为过去的一个时间点，这会让浏览器立即删除这个 cookie
      expires: new Date(1), // 或者使用 maxAge: -1
      overwrite: true,
      httpOnly: false,
    });
  }
  await next();
});

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

tiptap_router.get("/getData", async (ctx, next) => {
  if (ctx.fail) return await next();
  const { data } = ctx.request.body;
  try {
    const data = await tiptap_db.getData("/data");
    ctx.success = {
      msg: "保存成功",
      data
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