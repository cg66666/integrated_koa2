/*
 * @Description: file content
 * @Author: cg
 * @Date: 2024-08-20 17:38:06
 * @LastEditors: cg
 * @LastEditTime: 2024-09-25 17:54:50
 */
import { WebSocketServer } from "ws";
// const WebSocket = require("ws");
// const { room_db } = require("../app");
import { room_db } from "../app.js";

// 检查传递信息正确性
const checkInfo = async (ws, msg, wsList) => {
  const { room, user, password } = msg;
  const res = await room_db.exists(`/${room}`);
  // console.log('res', res)
  if (!res) {
    ws.send(
      JSON.stringify({
        ...msg,
        type: "tip",
        code: "A0001",
      })
    );
    return;
  }

  const roomInfo = await room_db.getData(`/${room}`);
  if (
    (password && password !== roomInfo.password) ||
    !roomInfo.userList.includes(user)
  ) {
    ws.send(
      JSON.stringify({
        ...msg,
        type: "tip",
        code: "A0001",
      })
    );
    return;
  }

  // init初始化操作
  if (wsList) {
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
    return;
  }

  // 更新时间
  roomInfo.updataTime = new Date().getTime();
  room_db.push(`/${room}`, roomInfo);
};

const ws = (server) => {
  const timerObj = {};
  // 用于全局发送信息时，发送正确信息
  const wsList = [];
  // 创建 WebSocket 服务器
  const wss = new WebSocketServer({ server });
  wss.on("connection", (ws) => {
    let timer; // 延时器，判断连接是否还存在
    console.log("WebSocket 连接已建立！");
    wsList.push({ ws });
    const length = wsList.length;
    let tempInfo;
    ws.on("message", async (message) => {
      const msg = JSON.parse(message);
      switch (msg.type) {
        // 初始化操作，用于通用变量赋值，与判断信息是否适用
        case "init": {
          console.log("init");
          tempInfo = msg;
          checkInfo(ws, msg, wsList);
          wsList[length - 1].room = msg.room;
          break;
        }
        // 传递信息
        case "message": {
          const { room } = msg;
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
          // console.log('ping')
          checkInfo(ws, msg);
          break;
        }
        default:
          break;
      }
    });
    ws.on("close", async function () {
      console.log("连接关闭", tempInfo);
      if (!tempInfo || !wsList) return;
      const res = await room_db.exists(`/${tempInfo.room}`);
      if (res) {
        const roomInfo = await room_db.getData(`/${tempInfo.room}`);
        let total = roomInfo.userList.length;
        wsList.forEach((client) => {
          if (
            client.room === tempInfo.room &&
            client.ws.readyState === WebSocket.OPEN
          ) {
            console.log("client", client);

            client.ws.send(
              JSON.stringify({
                type: "tip",
                code: "00000",
                total,
              })
            );
          }
        });
        return;
      }
    });
    ws.on("open", function () {
      console.log("连接成功");
    });
  });
};

export default ws;
