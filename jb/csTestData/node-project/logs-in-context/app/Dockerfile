FROM node:lts-slim
EXPOSE 3000

WORKDIR /app
COPY . .
RUN npm ci
CMD node server.js > ./logs/logs-in-context.log
