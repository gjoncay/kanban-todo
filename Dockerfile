# Grophie's To-Do — static page + tiny JSON API, no npm dependencies.
FROM node:22-alpine

WORKDIR /app
COPY server.js index.html ./

ENV PORT=8080 \
    DATA_DIR=/data

EXPOSE 8080
VOLUME ["/data"]

CMD ["node", "server.js"]
