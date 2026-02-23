/*
 * @Description: file content
 * @Author: 朱晨光
 * @Date: 2023-12-02 20:41:44
 * @LastEditors: cg
 * @LastEditTime: 2026-01-22 01:06:55
 */

// 引入日志工具
export { accessLogger, loggerChatRoom, loggerSSO } from "./log/index.js";

export {
  accountId_db,
  user_db,
  ticket_db,
  session_db,
  room_db,
  statement_db,
  tiptap_db,
} from "./db.js";

import Koa from "koa";

// 请求体处理
import { koaBody } from "koa-body";

// gzip压缩
import compress from "koa-compress";

// 路由集成
import router from "./controller/index.js";

// 统一处理返回内容
import handleResStatus from "./middleware/handleResStatus.js";

// websocket
import ws from "./ws/index.js";

// 日志工具
import { accessLogger } from "./app.js";

import path from "path";

import { fileURLToPath } from "url";

import staticMiddleware from "koa-static";

// 加载定时期插件
import schedule from "./db/schedule.js";
schedule();

const app = new Koa();

// 设置静态资源目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticPath = path.join(__dirname, "public"); // 假设静态资源存放在 public 目录
app.use(staticMiddleware(staticPath));

app.use(koaBody()); // 获取body上的内容

// 使用 koa-compress 压缩响应体
app.use(
  compress({
    threshold: 1024 * 2, // 只有响应体大于 1KB 才进行压缩
    br: false, // disable brotli
  }),
);

app.use(router.routes()); // 添加路由中间件

app.use(router.allowedMethods()); // 对请求进行一些限制处理

app.use(handleResStatus); // 对返回code码统一处理

// 添加日志功能
app.use(accessLogger());

const server = app.listen(8888, () => {
  let port = server.address().port;
  console.log("服务器开启: http://localhost:8888/", port);
  console.log("已配置当前环境变量", {
    ALIBABA_CLOUD_ACCESS_KEY_ID: process.env["ALIBABA_CLOUD_ACCESS_KEY_ID"],
    ALIBABA_CLOUD_ACCESS_KEY_SECRET:
      process.env["ALIBABA_CLOUD_ACCESS_KEY_SECRET"],
  });
});

// 开启websocket
ws(server);
