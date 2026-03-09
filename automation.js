import axios from "axios";
import Dypnsapi20170525, * as $Dypnsapi20170525 from "@alicloud/dypnsapi20170525";
import * as $OpenApi from "@alicloud/openapi-client";
import * as $Util from "@alicloud/tea-util";
import Credential, { Config } from "@alicloud/credentials";
import dayjs from "dayjs";
import { weekdayList } from "./db/gold/weekday.js";
import { gold_db } from "./app.js";

let time = 2000;

let today = "2026-03-06";

let isPush = false;

export const getGoldPrice = async () => {
  const curToday = dayjs().format("YYYY-MM-DD");
  if (curToday !== today) {
    if (!weekdayList.includes(curToday)) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(8, 50, 0, 0); // 重置为凌晨 00:00:00
      time = tomorrow.getTime() - now.getTime();
      setTimeout(() => {
        getGoldPrice();
      }, time);
      return;
    }
  }
  if (await gold_db.exists("/max") && await gold_db.exists("/min")) {
    try {
      const max =await gold_db.getData("/max");
      const min =await gold_db.getData("/min");
      const res = await axios({
        url: "https://api.jdjygold.com/gw2/generic/jrm/h5/m/stdLatestPrice?productSku=1961543816",
        method: "GET",
      });
      const curPrice = res.data.resultData.datas.price;
      const minDiff = curPrice - min;
      const maxDiff = max - curPrice;
      if (minDiff < 3 || maxDiff < 3) {
        time = 5000;
        if (minDiff <= 0 || maxDiff <= 0) {
          if (!isPush) {
            curPrice * 10;
            const credentialsConfig = new Config({
              // 凭证类型
              type: "access_key",
              // 设置accessKeyId值，此处已从环境变量中获取accessKeyId为例
              accessKeyId: process.env["DATABASE_KEY"],
              // 设置accessKeySecret值，此处已从环境变量中获取accessKeySecret为例
              accessKeySecret: process.env["DATABASE_SECRET"],
            });
            const credential = new Credential.default(credentialsConfig);
            let config = new $OpenApi.Config({
              credential,
            });
            config.endpoint = `dypnsapi.aliyuncs.com`;
            let client = new Dypnsapi20170525.default(config);
            const handleNum = Math.trunc(curPrice * 10);
            let sendSmsVerifyCodeRequest1 =
              new $Dypnsapi20170525.SendSmsVerifyCodeRequest({
                signName: "云渚科技验证平台",
                templateCode: "100005",
                phoneNumber: "13277090981",
                templateParam: `{"code":${handleNum},"min":"5"}`,
              });
            let sendSmsVerifyCodeRequest2 =
              new $Dypnsapi20170525.SendSmsVerifyCodeRequest({
                signName: "云渚科技验证平台",
                templateCode: "100005",
                phoneNumber: "18835201712",
                templateParam: `{"code":${handleNum},"min":"5"}`,
              });
            let runtime = new $Util.RuntimeOptions({});
            await client.sendSmsVerifyCodeWithOptions(
              sendSmsVerifyCodeRequest1,
              runtime,
            );
            await client.sendSmsVerifyCodeWithOptions(
              sendSmsVerifyCodeRequest2,
              runtime,
            );
            isPush = true;
          }
        } else {
          isPush = false;
        }
      } else {
        time = 10000;
        isPush = false;
      }
    } catch (err) {
      console.log("err", err);
    }
  }
  setTimeout(() => {
    getGoldPrice();
  }, time);
};
