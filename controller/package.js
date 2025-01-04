/*
 * @Description: 测试
 * @Author: 朱晨光
 * @Date: 2023-12-02 21:16:00
 * @LastEditors: cg
 * @LastEditTime: 2024-10-30 16:40:01
 */
import { user_db } from "../app.js";
import koaRouter from "koa-router";
import path from "path";
import fs from "fs";
const package_login = new koaRouter();

package_login.post("/download", async (ctx, next) => {
  const { frame, build, ui } = ctx.request.body;

  const filePath = path.resolve(
    import.meta.dirname,
    `../db/template/${frame}-${build}-${ui}-template.zip`
  );

  const fileStream = fs.createReadStream(filePath);
  ctx.set("Content-Type", "application/zip");
  ctx.set("Content-Disposition", `attachment; filename=react-umi-template.zip`);
  // 将文件流设置为 ctx.body
  ctx.body = fileStream;
  await next();
});

// console.log("inner", router_login.routes);
export default package_login;
