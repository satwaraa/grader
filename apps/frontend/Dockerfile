FROM oven/bun:1-alpine

WORKDIR /app

ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

COPY package.json bun.lockb* ./

RUN bun install

COPY . .

RUN bun run build

EXPOSE 5173

CMD ["bun", "x", "serve", "dist", "-s", "-l", "5173"]
