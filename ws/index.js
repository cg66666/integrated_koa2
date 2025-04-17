/*
 * @Description: file content
 * @Author: cg
 * @Date: 2024-08-20 17:38:06
 * @LastEditors: cg
 * @LastEditTime: 2025-04-17 21:43:17
 */
import { WebSocketServer, WebSocket } from "ws";
import { room_db } from "../app.js";
import { parse } from "url";
import { log } from "console";

// 用于聊天室全局发送信息时，发送正确信息
const wsChatList = [];
// 用于存储全局用户初始化的时间戳，用于判断当用于通过关闭网页的方式退出聊天室
const chatUserList = [];

// 用于tiptap中ws
const wsTiptapList = [];
// 用于tiptap中的全局用户信息存储
const tiptapUserList = {};

// 检查传递信息正确性
const checkInfo = async (ws, msg, wsChatList) => {
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
    wsChatList.forEach((client) => {
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
    chatUserList[string] = Date.now();
    roomInfo.updataTime = Date.now();
    room_db.push(`/${room}`, roomInfo);
  }
};

// WebSocket 路由函数
function route(ws, wss, path) {
  switch (path) {
    case "/ws/chat":
      console.log("WebSocket chat 连接已建立！");
      wsChatList.push({ ws });
      const length = wsChatList.length;
      let tempInfo;
      ws.on("message", async (message) => {
        const msg = JSON.parse(message);
        switch (msg.type) {
          // 初始化操作，用于通用变量赋值，与判断信息是否适用
          case "init": {
            // console.log("init", msg);
            tempInfo = { ...msg, index: length - 1 };
            checkInfo(ws, msg, wsChatList);
            wsChatList[length - 1].room = msg.room;
            break;
          }
          // 传递信息
          case "message": {
            // console.log("msg", msg);
            const { room } = msg;
            const roomInfo = room_db.getData(`/${room}`);
            const string = msg.room + msg.user + msg.password + msg.isAnonymity;
            // 更新时间
            chatUserList[string] = Date.now();
            roomInfo.updataTime = Date.now();
            room_db.push(`/${room}`, roomInfo);
            wsChatList.forEach((client) => {
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
        if (!tempInfo || !wsChatList) return;
        wsChatList.splice(tempInfo.index, 1);
        if (await room_db.exists(`/${tempInfo.room}`)) {
          let roomInfo = await room_db.getData(`/${tempInfo.room}`);
          var string =
            tempInfo.room +
            tempInfo.user +
            tempInfo.password +
            tempInfo.isAnonymity;
          let length = roomInfo.userList.length;
          // console.log("length", roomInfo, length);

          // 延迟清空房间，防止因为用户刷新就清空房间
          if (length === 1 && roomInfo.userList.includes(tempInfo.user)) {
            setTimeout(async () => {
              if (
                chatUserList[string] &&
                chatUserList[string] + 3500 < Date.now()
              ) {
                await room_db.delete(`/${tempInfo.room}`);
              }
            }, 3000);
          } else {
            chatUserList[string] = undefined;
            const index = roomInfo.userList.indexOf(tempInfo.user);
            if (index >= 0) {
              roomInfo.userList.splice(index, 1);
              length = roomInfo.userList.length;
              await room_db.push(`/${tempInfo.room}`, roomInfo);
            }
          }
          wsChatList.forEach((client) => {
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
      break;
    case "/ws/tiptap":
      console.log("tiptap连接成功");
      let userConfig2 = null;
      // 用于判断是否为第一次进入用户，进行初始化处理
      let isInit = true;
      ws.on("message", (message) => {
        const data = JSON.parse(message);
        switch (data.type) {
          case "updateUser": {
            const { userConfig, stopUpdate } = data;
            const target = tiptapUserList[userConfig.name];
            if (isInit) {
              userConfig2 = userConfig;
              isInit = false;
              wsTiptapList[userConfig.name] = ws;
            }

            if (
              !target ||
              (target &&
                (target.from != userConfig.from || target.to != userConfig.to))
            ) {
              tiptapUserList[userConfig.name] = userConfig;
              if (stopUpdate) break;
              Object.values(wsTiptapList).forEach((ws) => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: "updateUser",
                      tiptapUserList,
                      stopUpdate,
                    })
                  );
                }
              });
            }
            break;
          }
          case "transaction": {
            Object.values(wsTiptapList).forEach((ws) => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                console.log("transaction", data);
                ws.send(JSON.stringify(data));
              }
            });
            break;
          }
        }
      });

      ws.on("close", () => {
        console.log("Client disconnected", userConfig2);
        if (userConfig2) {
          wsTiptapList[userConfig2.name] = null;
          tiptapUserList[userConfig2.name] = null;
          // console.log("close", {
          //   type: "updateUser",
          //   tiptapUserList,
          // });
          Object.values(wsTiptapList).forEach((ws) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "updateUser",
                  tiptapUserList,
                  stopUpdate: false,
                })
              );
            }
          });
        }
      });
      // ws.on("message", (message) => {
      //   console.log(`[Notifications] Received: ${message}`);
      //   ws.send(`Echo from notifications: ${message}`);
      // });
      break;
    default:
      ws.send("Unknown WebSocket route");
      ws.close();
      break;
  }
}

const ws = (server) => {
  // 创建 WebSocket 服务器
  const wss = new WebSocketServer({ noServer: true });

  // 监听 upgrade 事件
  server.on("upgrade", (request, socket, head) => {
    const { pathname } = parse(request.url);
    // 如果路径以 /ws 开头，则处理 WebSocket 请求
    if (pathname.startsWith("/ws")) {
      // console.log(222, pathname);

      wss.handleUpgrade(request, socket, head, (ws) => {
        route(ws, wss, pathname);
      });
    } else {
      // 如果路径不匹配 WebSocket，则关闭连接
      socket.destroy();
    }
  });

  // wss.on("connection", (ws) => {
  //   console.log("WebSocket 连接已建立！");
  //   wsChatList.push({ ws });
  //   const length = wsChatList.length;
  //   let tempInfo;
  //   ws.on("message", async (message) => {
  //     const msg = JSON.parse(message);
  //     switch (msg.type) {
  //       // 初始化操作，用于通用变量赋值，与判断信息是否适用
  //       case "init": {
  //         console.log("init", msg);
  //         tempInfo = { ...msg, index: length - 1 };
  //         checkInfo(ws, msg, wsChatList);
  //         wsChatList[length - 1].room = msg.room;
  //         break;
  //       }
  //       // 传递信息
  //       case "message": {
  //         // console.log("msg", msg);
  //         const { room } = msg;
  //         const roomInfo = room_db.getData(`/${room}`);
  //         const string = msg.room + msg.user + msg.password + msg.isAnonymity;
  //         // 更新时间
  //         chatUserList[string] = Date.now();
  //         roomInfo.updataTime = Date.now();
  //         room_db.push(`/${room}`, roomInfo);
  //         wsChatList.forEach((client) => {
  //           if (
  //             client.room === room &&
  //             client.ws.readyState === WebSocket.OPEN
  //           ) {
  //             client.ws.send(JSON.stringify({ ...msg, code: "00000" }));
  //           }
  //         });
  //         break;
  //       }
  //       // 用于测试连接稳定性，并时刻判断信息是否依旧适用
  //       case "ping": {
  //         // console.log("ping", msg);
  //         // checkInfo(ws, msg);
  //         break;
  //       }
  //       default:
  //         break;
  //     }
  //   });
  //   ws.on("close", async function () {
  //     console.log("连接关闭", tempInfo);
  //     if (!tempInfo || !wsChatList) return;
  //     wsChatList.splice(tempInfo.index, 1);
  //     if (await room_db.exists(`/${tempInfo.room}`)) {
  //       let roomInfo = await room_db.getData(`/${tempInfo.room}`);
  //       var string =
  //         tempInfo.room +
  //         tempInfo.user +
  //         tempInfo.password +
  //         tempInfo.isAnonymity;
  //       let length = roomInfo.chatUserList.length;
  //       // 延迟清空房间，防止因为用户刷新就清空房间
  //       if (length === 1) {
  //         setTimeout(async () => {
  //           if (chatUserList[string] && chatUserList[string] + 3500 < Date.now()) {
  //             await room_db.delete(`/${tempInfo.room}`);
  //           }
  //         }, 3000);
  //       } else {
  //         chatUserList[string] = undefined;
  //         const index = roomInfo.chatUserList.indexOf(tempInfo.user);
  //         if (index >= 0) {
  //           roomInfo.chatUserList.splice(index, 1);
  //           length = roomInfo.chatUserList.length;
  //           await room_db.push(`/${tempInfo.room}`, roomInfo);
  //         }
  //       }
  //       wsChatList.forEach((client) => {
  //         if (
  //           client.room === tempInfo.room &&
  //           client.ws.readyState === WebSocket.OPEN
  //         ) {
  //           client.ws.send(
  //             JSON.stringify({
  //               type: "tip",
  //               code: "00000",
  //               total: length,
  //               userName: tempInfo.user,
  //             })
  //           );
  //         }
  //       });
  //     }
  //   });
  //   ws.on("open", function () {
  //     console.log("连接成功");
  //   });
  // });
};

export default ws;

/**
 * 未解决原地刷新页面后，会自动加入用户信息，不严谨，因为用户信息如果被人为修改，那么加入的用户方式就不规范了
 */
