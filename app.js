/*
 * @Description: file content
 * @Author: 朱晨光
 * @Date: 2023-12-02 20:41:44
 * @LastEditors: cg
 * @LastEditTime: 2025-04-17 08:10:14
 */

// 引入日志工具
export { accessLogger, loggerChatRoom, loggerSSO } from "./log/index.js";

// 数据库声明（注意执行顺序）
import { JsonDB, Config } from "node-json-db";

// account库，用于查重名称是否重复
export const accountId_db = new JsonDB(
  new Config("./db/sso/accountDataBase", true, false, "/")
);

// 个人信息数据库
export const user_db = new JsonDB(
  new Config("./db/sso/userDataBase", true, false, "/")
);

// 历史记录数据库（用于查询所有账号登录历史 废弃废弃废弃废弃废弃废弃废弃废弃）
// export const history_db = new JsonDB(
//   new Config("./db/sso/historyDataBase", true, false, "/")
// );

// 登录token存储数据库（用于查询token是否失效）
// export const loginToken_db = new JsonDB(
//   new Config("./db/sso/loginTokenDataBase", true, false, "/")
// );

// 登录ticket存储数据库（用于项目页获取当前项目token，一次性）
export const ticket_db = new JsonDB(
  new Config("./db/sso/loginTicketDataBase", true, false, "/")
);

// 类似sessionId存储数据库
export const session_db = new JsonDB(
  new Config("./db/sso/sessionDataBase", true, false, "/")
);

// 存储聊天室相关数据
export const room_db = new JsonDB(
  new Config("./db/chatRoom/roomDataBase", true, false, "/")
);

// 存储用户的自由表格相关信息
export const statement_db = new JsonDB(
  new Config("./db/statement/statementDataBase", true, false, "/")
);

// 存储tiptap文档内容
export const tiptap_db = new JsonDB(
  new Config("./db/tiptap/totalData", true, false, "/")
);

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

import path from 'path';

import { fileURLToPath } from "url";

import staticMiddleware from 'koa-static';

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
  })
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
