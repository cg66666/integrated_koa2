/*
 * @Description: file content
 * @Author: cg
 * @Date: 2024-08-20 17:38:06
 * @LastEditors: cg
 * @LastEditTime: 2024-11-04 14:54:31
 */
import { WebSocketServer, WebSocket } from "ws";
import { room_db } from "../app.js";

// 用于全局发送信息时，发送正确信息
const wsList = [];

// 用于存储全局用户初始化的时间戳，用于判断当用于通过关闭网页的方式退出聊天室
const userList = [];

// 检查传递信息正确性
const checkInfo = async (ws, msg, wsList) => {
  const { room, user, password } = msg;
  if (!(await room_db.exists(`/${room}`))) {
    ws.send(
      JSON.stringify({
        ...msg,
        type: "tip",
        code: "A0001",
      })
    );
    return;
  } else {
    const roomInfo = await room_db.getData(`/${room}`);
    if (password && password !== roomInfo.password) {
      ws.send(
        JSON.stringify({
          ...msg,
          type: "tip",
          code: "A0001",
        })
      );
      return;
    }
    if (!roomInfo.userList.includes(user)) roomInfo.userList.push(user);
    wsList.forEach((client) => {
      if (client.room === room && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(
          JSON.stringify({
            ...msg,
            type: "tip",
            code: "00000",
            msg: `欢迎${msg.user}进入房间`,
            total: roomInfo.userList.length,
            // timestamp
          })
        );
      }
    });
    const string = msg.room + msg.user + msg.password + msg.isAnonymity;
    // 更新时间
    userList[string] = Date.now();
    roomInfo.updataTime = Date.now();
    room_db.push(`/${room}`, roomInfo);
  }
};

const ws = (server) => {
  // 创建 WebSocket 服务器
  const wss = new WebSocketServer({ server });
  wss.on("connection", (ws) => {
    console.log("WebSocket 连接已建立！");
    wsList.push({ ws });
    const length = wsList.length;
    let tempInfo;
    ws.on("message", async (message) => {
      const msg = JSON.parse(message);
      switch (msg.type) {
        // 初始化操作，用于通用变量赋值，与判断信息是否适用
        case "init": {
          console.log("init", msg);
          tempInfo = { ...msg, index: length - 1 };
          checkInfo(ws, msg, wsList);
          wsList[length - 1].room = msg.room;
          break;
        }
        // 传递信息
        case "message": {
          // console.log("msg", msg);
          const { room } = msg;
          const roomInfo = room_db.getData(`/${room}`);
          const string = msg.room + msg.user + msg.password + msg.isAnonymity;
          // 更新时间
          userList[string] = Date.now();
          roomInfo.updataTime = Date.now();
          room_db.push(`/${room}`, roomInfo);
          wsList.forEach((client) => {
            if (
              client.room === room &&
              client.ws.readyState === WebSocket.OPEN
            ) {
              client.ws.send(JSON.stringify({ ...msg, code: "00000" }));
            }
          });
          break;
        }
        // 用于测试连接稳定性，并时刻判断信息是否依旧适用
        case "ping": {
          // console.log("ping", msg);
          // checkInfo(ws, msg);
          break;
        }
        default:
          break;
      }
    });
    ws.on("close", async function () {
      console.log("连接关闭", tempInfo);
      if (!tempInfo || !wsList) return;
      wsList.splice(tempInfo.index, 1);
      if (await room_db.exists(`/${tempInfo.room}`)) {
        let roomInfo = await room_db.getData(`/${tempInfo.room}`);
        var string =
          tempInfo.room +
          tempInfo.user +
          tempInfo.password +
          tempInfo.isAnonymity;
        let length = roomInfo.userList.length;
        // 延迟清空房间，防止因为用户刷新就清空房间
        if (length === 1) {
          setTimeout(async () => {
            if (userList[string] && userList[string] + 3500 < Date.now()) {
              await room_db.delete(`/${tempInfo.room}`);
            }
          }, 3000);
        } else {
          userList[string] = undefined;
          const index = roomInfo.userList.indexOf(tempInfo.user);
          if (index >= 0) {
            roomInfo.userList.splice(index, 1);
            length = roomInfo.userList.length;
            await room_db.push(`/${tempInfo.room}`, roomInfo);
          }
        }
        wsList.forEach((client) => {
          if (
            client.room === tempInfo.room &&
            client.ws.readyState === WebSocket.OPEN
          ) {
            client.ws.send(
              JSON.stringify({
                type: "tip",
                code: "00000",
                total: length,
                userName: tempInfo.user,
              })
            );
          }
        });
      }
    });
    ws.on("open", function () {
      console.log("连接成功");
    });
  });
};

export default ws;

/**
 * 未解决原地刷新页面后，会自动加入用户信息，不严谨，因为用户信息如果被人为修改，那么加入的用户方式就不规范了
 */
