# integrated_koa2

# 部署前请执行 npm run build 进行数据库、日志 清空

docker build . -t integrated_koa2

docker run -d --name integrated_koa2-container -p 8888:8888 integrated_koa2
