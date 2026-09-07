# Use official lightweight Bun image
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 3000

ENV NODE_ENV=production

# Run backend
CMD ["bun", "run", "src/index.ts"]
