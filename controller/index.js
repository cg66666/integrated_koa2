/*
 * @Description: 根据文件自动注册路由
 * @Author: 朱晨光
 * @Date: 2023-12-02 21:15:15
 * @LastEditors: cg
 * @LastEditTime: 2024-09-18 13:59:24
 */
/**
 * 文件名就是请求的前置route，使用fs统一配置
 */
import Router from "koa-router";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = new Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const files = fs.readdirSync(__dirname);

files
  .filter((f) => {
    return f.endsWith(".js") && !f.startsWith("index");
  })
  .forEach(async (file) => {
    const filePath = path.join(__dirname, file);
    const file_entity = await import(`file://${filePath.replace(/\\/g, "/")}`);
    const file_name = file.substring(0, file.length - 3);
    router.use(
      `/${file_name}`,
      file_entity.default.routes(),
      file_entity.default.allowedMethods()
    );
  });

export default router;
