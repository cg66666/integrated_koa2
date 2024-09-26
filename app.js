/*
 * @Description: file content
 * @Author: 朱晨光
 * @Date: 2023-12-02 20:41:44
 * @LastEditors: cg
 * @LastEditTime: 2024-09-25 17:51:47
 */

// 引入日志工具
export { accessLogger, loggerChatRoom, loggerSSO } from "./log/index.js";

// 数据库声明（注意执行顺序）
import { JsonDB, Config } from "node-json-db";

// account库，用于查重名称是否重复
export const accountId_db = new JsonDB(
  new Config("./db/accountDataBase", true, false, "/")
);

// 个人信息数据库
export const user_db = new JsonDB(
  new Config("./db/userDataBase", true, false, "/")
);

// 历史记录数据库（用于查询所有账号登录历史 废弃废弃废弃废弃废弃废弃废弃废弃）
export const history_db = new JsonDB(
  new Config("./db/historyDataBase", true, false, "/")
);

// 登录token存储数据库（用于查询token是否失效）
export const loginToken_db = new JsonDB(
  new Config("./db/loginTokenDataBase", true, false, "/")
);

// 登录ticket存储数据库（用于查询ticket是否失效，一次性）
export const ticket_db = new JsonDB(
  new Config("./db/loginTicketDataBase", true, false, "/")
);

// 类似sessionId存储数据库
export const session_db = new JsonDB(
  new Config("./db/sessionDataBase", true, false, "/")
);

// 存储聊天室相关数据
export const room_db = new JsonDB(
  new Config("./db/accountDataBase", true, false, "/")
);

import Koa from "koa";

// 请求体处理
import { koaBody } from "koa-body";

// 路由集成
import router from "./controller/index.js";

// 统一处理返回内容
import handleResStatus from "./middleware/handleResStatus.js";

// websocket
import ws from "./ws/index.js";

// 日志工具
import { accessLogger } from "./app.js";

// 加载定时期插件
import schedule from "./db/schedule.js";
schedule();

const app = new Koa();

app.use(koaBody()); // 获取body上的内容

app.use(router.routes()); // 添加路由中间件

app.use(router.allowedMethods()); // 对请求进行一些限制处理

app.use(handleResStatus); // 对返回code码统一处理

// 添加日志功能
app.use(accessLogger());

const server = app.listen(8080, () => {
  let port = server.address().port;
  console.log("服务器开启: http://localhost:8080/", port);
});

// 开启websocket
ws(server);
