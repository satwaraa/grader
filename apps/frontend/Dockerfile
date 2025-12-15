FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lockb* ./

RUN bun install

COPY . .

RUN bun run build

EXPOSE 5173

CMD ["bun", "x", "serve", "dist", "-s", "-l", "5173"]
