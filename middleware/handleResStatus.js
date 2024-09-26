/*
 * @Description: file content
 * @Author: 朱晨光
 * @Date: 2023-12-02 21:21:12
 * @LastEditors: cg
 * @LastEditTime: 2024-09-18 11:47:30
 */

export default async (ctx, next) => {
  // console.log(333, ctx);
  if (ctx.success) {
    if (!ctx.success.code && ctx.success.code !== 0) ctx.success.code = "00000";
    ctx.body = ctx.success;
  } else if (ctx.fail) {
    if (!ctx.fail.code) ctx.fail.code = "A0001"; // 失败的情况，msg提示内容
    ctx.body = ctx.fail;
  }
  // console.log("最终返回值", ctx.body);
  await next();
};
