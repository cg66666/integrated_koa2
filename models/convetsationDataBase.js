/*
 * @Description: file content
 * @Author: cg
 * @Date: 2026-02-23 19:21:04
 * @LastEditors: cg
 * @LastEditTime: 2026-03-02 02:02:03
 */
import { DataTypes } from "sequelize";
import sequelize from "../mysql.js";

export const conversation_db = sequelize.define(
  "conversation_db",
  {
    // 列: id
    // 类型: int, 非空, 自增, 主键
    chatId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    // 列: conversation
    // 类型: json, 非空
    conversation: {
      type: DataTypes.JSON,
      allowNull: false,
      // 如果数据库层面没有默认值，这里通常不需要设 defaultValue
      // 如果业务上需要确保存入的是数组或对象，可以在 setter 中校验，但模型层主要做类型映射
    },
  },
  {
    tableName: "conversationdatabase", // 表名
    timestamps: false, // ⭐ 重要：关闭自动时间戳（因为表里已有 createTime）
    underscored: false, // 字段名保持原样（驼峰）
    freezeTableName: true, // 表名不自动变复数
    createdAt: false, // 不自动生成 createdAt
    updatedAt: false, // 不自动生成 updatedAt
  },
);

