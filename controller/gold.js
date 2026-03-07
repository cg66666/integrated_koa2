/*
 * @Description: file content
 * @Author: cg
 * @Date: 2026-03-07 13:10:25
 * @LastEditors: cg
 * @LastEditTime: 2026-03-07 13:32:27
 */
import { gold_db } from "../app.js";
import koaRouter from "koa-router";
const gold_router = new koaRouter();

gold_router.get("/setPrice", async (ctx, next) => {
  const { max, min } = ctx.query;
  if (max && min && max > min) {
    gold_db.push("/min", min);
    gold_db.push("/max", max);
    ctx.success = {
      msg: `修改成功`,
    };
  } else {
    ctx.fail = {
      msg: `参数错误`,
    };
  }

  await next();
});

export default gold_router;
