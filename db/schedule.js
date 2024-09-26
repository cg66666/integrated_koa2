/*
 * @Description: 定时执行
 * @Author: 朱晨光
 * @Date: 2024-06-27 10:04:49
 * @LastEditors: cg
 * @LastEditTime: 2024-09-25 16:49:05
 */
import { loggerSSO } from "../app.js";
import schedule from "node-schedule";
import fs from "fs";

export default () => {
  // 0点准时触发
  schedule.scheduleJob("0 0 0 * * ? ", function () {
    console.log("0点 清洗token数据库");
    if (fs.existsSync("./db/tokenDataBase.json")) {
      // 删除文件
      fs.unlinkSync("./db/tokenDataBase.json");
    }
  });
  // 每小时触发一次检查
  schedule.scheduleJob("0 0 0/1 * * ? ", async function () {
    const roomInfo = await room_db.getData("/");
    const currentTime = new Date().getTime();
    if (roomInfo) {
      const deleteList = [];
      for (let key in roomInfo) {
        const updataTime = roomInfo[key].updataTime;
        if (currentTime > updataTime + 1800000) {
          deleteList.push(roomInfo[key]);
          delete roomInfo[key];
        }
      }
      if (deleteList.length) loggerSSO.info("执行房间过期清空扫描", deleteList);
      room_db.push("/", roomInfo);
    }
  });
  console.log("定时器程序已开启！");
};
