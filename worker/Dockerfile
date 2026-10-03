# Build from the repository root so the shared rules are included:
#   docker build -f worker/Dockerfile -t amp-media-worker .
FROM node:22-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY shared ./shared
COPY worker/package.json worker/package-lock.json ./worker/
RUN cd worker && npm ci --omit=dev
COPY worker/src ./worker/src
COPY worker/tsconfig.json ./worker/
WORKDIR /app/worker
USER node
CMD ["npx", "tsx", "src/index.ts"]
