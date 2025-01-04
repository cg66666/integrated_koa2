/*
 * @Description: 定时执行
 * @Author: 朱晨光
 * @Date: 2024-06-27 10:04:49
 * @LastEditors: cg
 * @LastEditTime: 2024-12-27 17:31:34
 */
import {
  loggerSSO,
  room_db,
  loggerChatRoom,
  // loginToken_db,
  session_db,
  ticket_db,
} from "../app.js";
import schedule from "node-schedule";
import fs from "fs";

export default () => {
  // 0点准时触发，清空
  // schedule.scheduleJob("0 0 0 * * ? ", function () {
  //   if (fs.existsSync("./db/tokenDataBase.json")) {
  //     loggerSSO.info({
  //       msg: "清空登录token数据库",
  //     });
  //     // 删除文件
  //     fs.unlinkSync("./db/tokenDataBase.json");
  //   }
  // });
  // 每小时触发一次库检查
  schedule.scheduleJob("0 0 0/1 * * ? ", async function () {
    // 检查聊天室
    const roomInfo = await room_db.getData("/");
    const currentTime = Date.now();
    if (roomInfo) {
      const deleteList = [];
      for (let key in roomInfo) {
        const updataTime = roomInfo[key].updataTime;
        if (currentTime > updataTime + 1800000) {
          deleteList.push(roomInfo[key]);
          delete roomInfo[key];
        }
      }
      if (deleteList.length)
        loggerChatRoom.info("执行房间过期清空扫描", deleteList);
      room_db.push("/", roomInfo);
    }

    // 检查登录ticket与登录token
    const ticket = await ticket_db.getData("/");
    const session = await session_db.getData("/");
    if (ticket) {
      for (let key in ticket) {
        const id = ticket[key].id;
        if (!session || !session[id]) {
          delete ticket[key];
          loggerSSO.info("执行ticket过期清空扫描", key);
        } else if (session[id].expireTime < currentTime) {
          delete session[id];
          delete ticket[key];
          loggerSSO.info("执行ticket、session过期清空扫描", key, id);
        }
        ticket_db.push("/", ticket);
        session_db.push("/", session);
      }
    }
  });
  console.log("定时器处理程序已开启！");
};
