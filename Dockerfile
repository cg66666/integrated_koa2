# 基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 添加应用的依赖
COPY package*.json ./

# npm设置源
RUN npm config set registry https://registry.npmmirror.com/

# 安装依赖pm2
RUN npm install -g pm2

# 安装依赖
RUN npm install

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8888

# 设置环境变量（部署的时候配置）
ENV ALIBABA_CLOUD_ACCESS_KEY_ID=
ENV ALIBABA_CLOUD_ACCESS_KEY_SECRET=

# 启动命令
# CMD ["npm","run","pm2"]
CMD ["pm2-runtime", "app.js"]