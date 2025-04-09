/*
 * @Description: 测试
 * @Author: cg
 * @Date: 2023-12-02 21:16:00
 * @LastEditors: cg
 * @LastEditTime: 2025-04-09 18:40:49
 */
// x-token 聊天室token
import {
  room_db,
  user_db,
  accountId_db,
  loggerSSO,
  ticket_db,
  session_db,
  loggerChatRoom,
} from "../app.js";
import koaRouter from "koa-router";

// jwt相关配置
import jwt from "jsonwebtoken";

import secret from "../db/jwt_secret.js";
const room_router = new koaRouter();

// 创建房间
room_router.post("/create", async (ctx, next) => {
  if (ctx.fail) return await next();
  const { room, user, password } = ctx.request.body;
  if (await room_db.exists(`/${room}`)) {
    ctx.fail = {
      msg: `该房间已存在！`,
    };
  } else {
    await room_db.push(`/${room}`, {
      password,
      userList: [user],
      updataTime: Date.now(),
    });
    loggerChatRoom.info({
      msg: `新建房间`,
      room,
    });
    ctx.success = {
      msg: `房间新建成功！`,
    };
  }
  await next();
});

// 加入房间
room_router.post("/join", async (ctx, next) => {
  if (ctx.fail) return await next();
  const { room, user, password } = ctx.request.body;
  if (!(await room_db.exists(`/${room}`))) {
    ctx.fail = {
      msg: `进入失败！房间名错误或密码错误。`,
    };
  } else {
    const roomInfo = await room_db.getData(`/${room}`);
    if (roomInfo.password !== password) {
      ctx.fail = {
        msg: `进入失败！房间名错误或密码错误。`,
      };
    } else if (roomInfo.userList.indexOf(user) >= 0) {
      ctx.fail = {
        msg: `该用户名已存在！`,
      };
    } else {
      roomInfo.updataTime = Date.now();
      roomInfo.userList.push(user);
      await room_db.push(`/${room}`, roomInfo);
      ctx.success = {
        msg: `房间加入成功！`,
      };
    }
  }
  await next();
});

// 离开房间
room_router.post("/leave", async (ctx, next) => {
  if (ctx.fail) return await next();
  const { room, user } = ctx.request.body;
  const roomInfo = await room_db.getData(`/${room}`);
  if (roomInfo.userList.length === 1) {
    await room_db.delete(`/${room}`);
  } else {
    const index = roomInfo.userList.indexOf(user);
    roomInfo.userList.splice(index, 1);
    if (roomInfo.userList.length === 0) {
      await room_db.delete(`/${room}`);
    } else {
      roomInfo.updataTime = Date.now();
      await room_db.push(`/${room}`, roomInfo);
    }
  }
  ctx.success = {
    msg: `房间退出成功！`,
  };
  await next();
});

// 根据ticket获取token
room_router.post("/getToken", async (ctx, next) => {
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
        secret.roomSecret
      );
      ctx.cookies.set("X-TOKEN", token, {
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
room_router.get("/checkToken", async (ctx, next) => {
  if (ctx.fail) return await next();
  const token = ctx.header["x-token"];
  if (token) {
    let handleData;
    try {
      handleData = jwt.verify(token, secret.roomSecret);
      if (await session_db.exists(`/${handleData.id}`)) {
        const sessionData = await session_db.getData(`/${handleData.id}`);
        if (sessionData.expireTime >= Date.now()) {
          ctx.success = {
            data: {
              ok: true,
            },
          };
        }
      }else{
        ctx.status = 401;
        ctx.success = {
          msg: "登录信息失效！",
        };
      }
    } catch {}
  }
  if (!ctx.success) {
    ctx.success = {
      data: {
        ok: false,
      },
    };
  }
  await next();
});

// 获取登录用户信息
room_router.get("/getUserInfo", async (ctx, next) => {
  if (ctx.fail) return await next();
  const token = ctx.header["x-token"];
  let handleData;
  try {
    handleData = jwt.verify(token, secret.roomSecret);
    if (await user_db.exists(`/${handleData.id}`)) {
      const data = await user_db.getData(`/${handleData.id}`);
      ctx.success = {
        msg: "登录信息失效！",
        data: {
          name: data.userName,
        },
      };
    } else {
      ctx.status = 401;
      ctx.success = {
        msg: "登录信息失效！",
      };
    }
  } catch {}

  await next();
});

// 全局退出登录
room_router.get("/logout", async (ctx, next) => {
  if (ctx.fail) return await next();
  const token = ctx.header["x-token"];
  if (!token) {
    ctx.success = {
      msg: "退出登陆成功！",
    };
  } else {
    let handleData;
    try {
      handleData = jwt.verify(token, secret.roomSecret);
      await session_db.delete(`/${handleData.id}`);
    } catch {}
    // 清空名cookie
    ctx.cookies.set("X-TOKEN", "", {
      // 设置过期时间为过去的一个时间点，这会让浏览器立即删除这个 cookie
      expires: new Date(1), // 或者使用 maxAge: -1
      overwrite: true,
      httpOnly: false,
    });
    ctx.success = {
      msg: "退出登陆成功！",
    };
  }
  await next();
});

export default room_router;