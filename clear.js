/*
 * @Description: file content
 * @Author: cg
 * @Date: 2024-12-29 17:15:09
 * @LastEditors: cg
 * @LastEditTime: 2025-04-09 15:12:04
 */
import fs from "fs/promises";
import path from "path";

const deleteFilesInDirectory = async (directoryPath) => {
  try {
    // 读取目录中的所有文件和子目录
    const files = await fs.readdir(directoryPath);

    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const stats = await fs.stat(filePath);
      // 如果是文件且扩展名为.json或.log，则删除该文件
      if (
        stats.isFile() &&
        (path.extname(file) === ".json" || path.extname(file) === ".log")
      ) {
        await fs.unlink(filePath);
      }
      // 如果是目录，则递归调用此函数处理子目录
      else if (stats.isDirectory()) {
        // 特殊处理tiptap数据库不删除
        if(file == 'tiptap') return
        await deleteFilesInDirectory(filePath);
      }
    }
  } catch (error) {
    console.error("Error occurred:", error);
  }
};

// 使用方法：传入你想要清理的文件夹路径
deleteFilesInDirectory("db");
deleteFilesInDirectory("log");
