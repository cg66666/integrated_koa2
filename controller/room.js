/*
 * @Description: 测试
 * @Author: cg
 * @Date: 2023-12-02 21:16:00
 * @LastEditors: cg
 * @LastEditTime: 2026-02-27 16:56:54
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
import handleCheckToken from "../middleware/handleCheckToken.js";

// jwt相关配置
import jwt from "jsonwebtoken";
import getToken from "../middleware/getToken.js";
import logout from "../middleware/logout.js";

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
  }
  // else {
  //   const index = roomInfo.userList.indexOf(user);
  //   roomInfo.userList.splice(index, 1);
  //   if (roomInfo.userList.length === 0) {
  //     await room_db.delete(`/${room}`);
  //   } else {
  //     roomInfo.updataTime = Date.now();
  //     await room_db.push(`/${room}`, roomInfo);
  //   }
  // }
  ctx.success = {
    msg: `房间退出成功！`,
  };
  await next();
});

// 根据ticket获取token
room_router.post(
  "/getToken",
  async (ctx, next) => {
    if (ctx.fail) return await next();
    ctx.secret = secret.roomSecret;
    ctx.tokenName = "X-TOKEN";
    await next();
  },
  getToken,
);

// 校验token
room_router.get(
  "/checkToken",
  async (ctx, next) => {
    if (ctx.fail) return await next();
    ctx.token = ctx.header["x-token"];
    ctx.secret = secret.roomSecret;
    await next();
  },
  handleCheckToken,
);

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
room_router.get(
  "/logout",
  async (ctx, next) => {
    if (ctx.fail) return await next();
    ctx.tokenName = "X-TOKEN";
    ctx.secret = secret.roomSecret;
    ctx.token = ctx.header["x-token"];
    await next();
  },
  logout,
);

export default room_router;
