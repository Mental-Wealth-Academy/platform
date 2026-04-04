FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files and install
COPY blue-server/package.json blue-server/bun.lock* ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Copy server code and tsconfig
COPY blue-server/server.ts blue-server/tsconfig.json ./

# Copy character file (server imports from ./lib/bluepersonality.json)
RUN mkdir -p lib
COPY lib/bluepersonality.json ./lib/bluepersonality.json

EXPOSE 3001

CMD ["bun", "run", "server.ts"]
