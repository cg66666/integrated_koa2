/*
 * @Description: 日志页面
 * @Author: cg
 * @Date: 2024-08-28 17:01:41
 * @LastEditors: cg
 * @LastEditTime: 2024-09-25 16:06:28
 */
// const path = require("path");
import path from "path";
import { fileURLToPath } from "url";
import log4js from "koa-log4";
// const log4js = require("koa-log4");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUNTIME_PATH = path.resolve(__dirname, "../");
const LOG_PATH = path.join(RUNTIME_PATH, "log");

log4js.configure({
  // 日志的输出
  appenders: {
    common: {
      type: "dateFile",
      pattern: "-yyyy-MM-dd.log", //生成文件的规则
      alwaysIncludePattern: true, // 文件名始终以日期区分
      backups: 30,
      encoding: "utf-8",
      filename: path.join(LOG_PATH, "common.log"), //生成文件名
    },
    // SSO登录
    SSO: {
      type: "dateFile",
      pattern: "-yyyy-MM-dd.log",
      alwaysIncludePattern: true,
      backups: 30,
      encoding: "utf-8",
      filename: path.join(LOG_PATH, "SSO", "SSO.log"),
    },
    // 聊天室
    ChatRoom: {
      type: "dateFile",
      pattern: "-yyyy-MM-dd.log",
      alwaysIncludePattern: true,
      backups: 30,
      encoding: "utf-8",
      filename: path.join(LOG_PATH, "ChatRoom", "ChatRoom.log"),
    },
    out: {
      type: "console",
    },
  },
  categories: {
    default: { appenders: ["out"], level: "info" },
    common: { appenders: ["common"], level: "info" },
    login: { appenders: ["SSO"], level: "info" },
    chatRoom: { appenders: ["ChatRoom"], level: "info" },
  },
});

// // getLogger 传参指定的是类型
export const accessLogger = () => log4js.koaLogger(log4js.getLogger("common")); // 记录所有访问级别的日志
export const loggerChatRoom = log4js.getLogger("ChatRoom");
export const loggerSSO = log4js.getLogger("SSO");
