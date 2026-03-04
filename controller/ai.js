/*
 * @Description: file content
 * @Author: cg
 * @Date: 2026-02-24 17:14:30
 * @LastEditors: cg
 * @LastEditTime: 2026-03-04 15:41:07
 */
import koaRouter from "koa-router";
import OpenAI from "openai";
import { ai_db, conversation_db } from "../models/index.js";
// jwt相关配置
import jwt from "jsonwebtoken";
import axios from "axios";
import { nanoid } from "nanoid";
import { user_db, ticket_db, session_db } from "../app.js";
import { PassThrough } from "stream";
import handleCheckToken from "../middleware/handleCheckToken.js";
import getToken from "../middleware/getToken.js";
import logout from "../middleware/logout.js";
import secret from "../db/jwt_secret.js";
import _ from "lodash";

// 临时存储当前用户信息
const userContextMap = new Map();

const ai_router = new koaRouter();

// 校验token
ai_router.get(
  "/checkToken",
  async (ctx, next) => {
    if (ctx.fail) {
      await next();
      return;
    }
    ctx.token = ctx.header["ai-token"];
    ctx.secret = secret.aiSecret;
    await next();
  },
  handleCheckToken,
);

// 获取登录用户信息
ai_router.get("/getUserInfo", async (ctx, next) => {
  if (ctx.fail) {
    await next();
    return;
  }
  const token = ctx.header["ai-token"];
  try {
    const handleData = jwt.verify(token, secret.aiSecret);
    if (await user_db.exists(`/${handleData.id}`)) {
      const data = await user_db.getData(`/${handleData.id}`);
      ctx.success = {
        msg: "success",
        data: data.userName,
      };
    }
  } catch {
    ctx.status = 401;
    ctx.success = {
      msg: "登录信息失效！",
    };
  }
  await next();
});

// 根据ticket获取token
ai_router.post(
  "/getToken",
  async (ctx, next) => {
    if (ctx.fail) return;
    ctx.secret = secret.aiSecret;
    ctx.tokenName = "ai-token";
    await next();
  },
  getToken,
);

let timer = null;

const clearFunc = () => {
  timer = setInterval(() => {
    // 关闭定时器
    if (userContextMap.size == 0) {
      clearInterval(timer);
      return;
    }
    for (const [key, value] of userContextMap) {
      if (value.updataTime + 10 * 60 * 1000 < Date.now()) {
        if (key.includes("temp_")) {
          userContextMap.delete(key);
        } else {
          conversation_db.upsert({
            chatId: key,
            conversation: value,
          });
          userContextMap.delete(key);
        }
      }
    }
  }, 90000);
};

clearFunc();

ai_router.post("/getHistory", async (ctx, next) => {
  const token = ctx.header["ai-token"];
  try {
    const handleData = jwt.verify(token, secret.aiSecret);
    if (await user_db.exists(`/${handleData.id}`)) {
      const list = await ai_db.findAll({
        where: {
          userId: handleData.id, // 命中 userId 索引
        },
        order: [["updatedAt", "DESC"]], // 按更新时间倒序排列（由新到旧）
        attributes: ["chatId", "title"],
        raw: true,
      });
      ctx.success = {
        data: list,
      };
    } else {
      ctx.status = 401;
      ctx.success = {
        msg: "登录信息失效！",
      };
    }
  } catch (err) {
    console.log("err", err);
    ctx.status = 401;
    ctx.success = {
      msg: "登录信息失效！",
    };
  }
  await next();
});

ai_router.post("/getConversation", async (ctx, next) => {
  // 检查工作
  const { id } = ctx.request.body;
  let content = [];
  try {
    if (id) {
      // 读取缓存
      if (userContextMap.has(id)) {
        content = userContextMap.get(id).detail;
      } else {
        const target = await conversation_db.findByPk(id, {
          raw: true,
          attributes: ["conversation"],
        });
        content = target.conversation.detail;
        if (content) {
          userContextMap.set(id, {
            detail: content,
            updataTime: Date.now(),
          });
        } else {
          userContextMap.set(id, { detail: [], updataTime: Date.now() });
        }
        clearFunc();
      }
    } else {
      ctx.fail = {
        msg: "缺失参数",
      };
      await next();
      return;
    }
  } catch (err) {
    console.log("err", err);
    ctx.fail = {
      msg: "系统错误",
    };
  }
  if (content[0] && content[0].role === "system") {
    content = content.slice(1);
  }
  // console.log("getConversation", content);

  ctx.success = {
    data: content,
  };
  await next();
});

const client = new OpenAI({
  apiKey: process.env["AI_KEY"],
  baseURL: process.env["AI_URL"],
});

// 获取标题
const getTitle = async (question, answer) => {
  const message = `
  用户问题：${question}
  模型回答：${answer}
  任务：请根据上述对话内容，生成一个简短、精准的标题，概括核心议题。标题长度控制在15个字以内，不要包含标点符号。
  `;
  const messageList = [{ role: "user", content: message }];
  const response = await client.chat.completions.create({
    model: "qwen3.5-plus",
    messages: messageList,
    enable_thinking: false,
  });
  return response;
};

ai_router.post("/chat", async (ctx, next) => {
  const token = ctx.header["ai-token"];
  const { chatId, message, isInit } = ctx.request.body;
  let curDetail = [];
  const userId = chatId || `temp_${ctx.ip}`;
  if (!isInit) {
    const content = { ...userContextMap.get(userId) };
    // 删除放置被检查
    userContextMap.delete(userId);
    curDetail = content.detail;
    curDetail.push({ role: "user", content: message });
  } else {
    curDetail = [
      {
        role: "system",
        content:
          "你是一个乐于助人、知识渊博、客观公正的已经开启联网能力的AI助手。请用中文回答我的问题，并确保信息准确、表达清晰。",
        isPrompt: true,
      },
      { role: "user", content: message },
    ];
  }
  // 设置流式响应头
  ctx.res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Nginx 关键配置
  });
  // 移除可能存在的 Content-Length 等干扰头
  ctx.response.remove("Content-Length");
  let curTokens = 0;
  let fullMessage = "";
  try {
    const response = await client.chat.completions.create({
      model: "qwen3.5-plus",
      messages: curDetail,
      // temperature: 1,
      enable_thinking: false,
      stream: true,
      stream_options: {
        include_usage: true,
      },
      enable_search: true,
    });

    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (chunk.usage?.total_tokens) {
        curTokens = chunk.usage.total_tokens;
      }
      if (content) {
        fullMessage += content; // 累计完整消息
        // 构造 SSE 格式的数据并直接写入原生响应流
        const sseData = `data: ${JSON.stringify({ content })}\n\n`;
        ctx.res.write(sseData);
        // 强制刷新缓冲区（关键）
        ctx.res.flushHeaders?.();
      }
    }
  } catch (error) {
    console.error("Error during chat completion:", error);
    const errorData = `data: ${JSON.stringify({ error: error.message })}\n\n`;
    ctx.res.write(errorData);
  } finally {
    let title;
    // 初始化需要计算标题消耗
    if (isInit) {
      const titleConfig = await getTitle(message, fullMessage);
      title = titleConfig.choices[0].message.content;
    }
    const finalData = `[DONE]: ${JSON.stringify({ curTokens, title })}\n\n`;
    ctx.res.write(finalData);
    ctx.res.flushHeaders?.();
    curDetail.push({
      role: "system",
      tokens: curTokens,
      content: fullMessage,
    });

    userContextMap.set(userId, {
      detail: curDetail,
      updataTime: Date.now(),
    });

    // 登录用户创建内容
    if (token && isInit) {
      const userId = jwt.verify(token, secret.aiSecret).id;
      console.log("ai_db", userId, chatId, title);
      try {
        await ai_db.create({
          chatId,
          userId,
          title,
        });
      } catch (err) {
        console.log("err", err);
      }

      ctx.res.write(`[updatad]\n\n`);
    }
    ctx.res.end();
  }
  await next();
});

// 全局退出登录
ai_router.get(
  "/logout",
  async (ctx, next) => {
    if (ctx.fail) return;
    ctx.tokenName = "ai-token";
    ctx.secret = secret.aiSecret;
    ctx.token = ctx.header["ai-token"];
    await next();
  },
  logout,
);

export default ai_router;
