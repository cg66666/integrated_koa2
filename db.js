/*
 * @Description: file content
 * @Author: cg
 * @Date: 2026-01-22 00:50:50
 * @LastEditors: cg
 * @LastEditTime: 2026-01-22 00:51:06
 */
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
