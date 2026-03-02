/*
 * @Description: file content
 * @Author: cg
 * @Date: 2026-02-23 19:21:04
 * @LastEditors: cg
 * @LastEditTime: 2026-03-02 02:01:51
 */
import { DataTypes } from "sequelize";
import sequelize from "../mysql.js";

export const ai_db = sequelize.define(
  "ai_db",
  {
    // 列: id
    // 类型: int, 非空, 自增, 主键
    chatId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },

    // 列: userId
    // 类型: varchar(50), 非空, 索引 (MUL)
    userId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "userId", // 确保字段名大小写匹配 (MySQL 通常不敏感，但建议明确)
      // 如果数据库已经建好索引，这里加 index: true 是为了让 Sequelize 知道它有索引
      // 如果运行 sync({ alter: true })，Sequelize 会尝试创建这个索引
      index: true,
    },

    // 列: title
    // 类型: varchar(50), 非空
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    // 列: updatedAt
    // 类型: timestamp, 非空
    // Sequelize 会自动管理这个字段的更新
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      // 如果数据库默认值是 CURRENT_TIMESTAMP ON UPDATE，Sequelize 通常会尊重它
      // 这里主要做类型映射
    },
  },
  {
    tableName: "aidatabase", // 表名
    timestamps: true,
    underscored: false, // 字段名保持原样（驼峰）
    // freezeTableName: true, // 表名不自动变复数
    createdAt: false, // 不自动生成 createdAt
    // updatedAt: false, // 不自动生成 updatedAt
  },
);
