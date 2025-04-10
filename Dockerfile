# 基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制应用代码
COPY . .

# npm设置源
RUN npm config set registry https://registry.npmmirror.com/

# 安装依赖pm2
RUN npm i pnpm -g

# 安装依赖pm2
RUN pnpm install -g pm2

# 安装依赖
RUN pnpm install

# 暴露端口
EXPOSE 8888

CMD ["pm2-runtime", "app.js"]