/*
 * @Description: 测试
 * @Author: cg
 * @Date: 2023-12-02 21:16:00
 * @LastEditors: cg
 * @LastEditTime: 2024-09-25 16:49:22
 */
import { room_db } from "../app.js";
import koaRouter from "koa-router";

// jwt相关配置
import jwt from "jsonwebtoken";

// const secret = require("../db/jwt_secret");
import secret from "../db/jwt_secret.js";
const room_router = new koaRouter();

// 创建房间
room_router.post("/create", async (ctx, next) => {
  const { room, user, password } = ctx.request.body;
  if (await room_db.exists(`/${room}`)) {
    ctx.fail = {
      msg: `该房间已存在！`,
    };
  } else {
    await room_db.push(`/${room}`, {
      password,
      userList: [user],
      updataTime: new Date().getTime(),
    });
    ctx.success = {
      msg: `房间新建成功！`,
    };
  }
  await next();
});

// 加入房间
room_router.post("/join", async (ctx, next) => {
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
      roomInfo.updataTime = new Date().getTime();
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
      roomInfo.updataTime = new Date().getTime();
      await room_db.push(`/${room}`, roomInfo);
    }
  }
  ctx.success = {
    msg: `房间退出成功！`,
  };
  await next();
});

// 获取token
room_router.post("/getToken", async (ctx, next) => {
  const { ticket } = ctx.request.body;
  if (ticket) {
    // const res = await axios.get(
    //   "http://localhost:8080/SSO/getUserId?ticket=" + ticket
    // );
    // if (res.data.code === "00000") {
    //   console.log("getToken", res.data.data);
    //   const token = jwt.sign(
    //     { id: res.data.data.id, expireTime: res.data.data.expireTime },
    //     secret
    //   );
    //   ctx.cookies.set("X-TOKEN", token, {
    //     overwrite: true,
    //     httpOnly: false,
    //   });
    //   ctx.success = {
    //     msg: "登陆成功",
    //   };
    // }
    ctx.success = {
      msg: "登陆成功",
    };
  } else {
    ctx.fail = {
      msg: "传参缺失！",
    };
  }

  // console.log('res', res)
  await next();
});

// 校验token
room_router.get("/checkToken", async (ctx, next) => {
  const token = ctx.header["x-token"];
  console.log("token", token);
  const handleData = jwt.verify(token, secret.roomSecret);

  // const res = await axios.get(
  //   "http://localhost:8080/SSO/checkSession?id=" + handleData.id
  // );
  // console.log("res", res);
  // if (!res.data.data.isValidate) {
  //   ctx.status = 401;
  //   ctx.success = {
  //     msg: "登录信息失效！",
  //   };
  // } else {
  //   ctx.success = {
  //     data: {
  //       ok: true,
  //     },
  //   };
  // }
  ctx.success = {
    data: {
      ok: true,
    },
  };
  await next();
});

// 获取登录用户信息
// secret
room_router.get("/getUserInfo", async (ctx, next) => {
  const token = ctx.header["x-token"];
  console.log("token", token);
  // const res = await axios.get('http://localhost:8080/SSO/getUserInfo?id=1234567')
  // console.log('res', res)

  await next();
});

export default room_router;
