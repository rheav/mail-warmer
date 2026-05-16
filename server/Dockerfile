FROM node:20-alpine

WORKDIR /app

# Install deps first so the layer caches when only source changes.
COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./
COPY data ./data
COPY public ./public

ENV PORT=3000
EXPOSE 3000

# Lightweight liveness check.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:3000/health || exit 1

USER node
CMD ["node", "server.js"]
