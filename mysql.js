/*
 * @Description: file content
 * @Author: cg
 * @Date: 2026-02-24 17:46:37
 * @LastEditors: cg
 * @LastEditTime: 2026-03-02 14:55:39
 */
import { Sequelize } from "sequelize";

// process.env["DATABASE_KEY"]
const sequelize = new Sequelize(
  process.env["DATABASE_NAME"],
  process.env["DATABASE_ACCOUNT"],
  process.env["DATABASE_password"],
  {
    host: process.env["DATABASE_ip"],
    port: 3306,
    dialect: "mysql",
    timezone: "+08:00", // 东八区
    pool: {
      // 连接池配置
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true, // 自动添加 createdAt/updatedAt
      underscored: true, // 字段自动转下划线 (userName -> user_name)
      freezeTableName: true, // 表名不自动变复数 (User -> User, 不是 Users)
      charset: "utf8mb4", // 字符集
    },
    // 日志配置
    logging: console.log,
    benchmark: true, // 显示 SQL 执行时间
    dialectOptions: {
      connectAttributes: {
        // 需传入字符串
        allowPublicKeyRetrieval: "true",
      },
    },
  },
);

export default sequelize;
