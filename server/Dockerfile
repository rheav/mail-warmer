# Debian-slim base: better-sqlite3 ships prebuilt binaries for glibc, so the
# native module installs without a compiler toolchain.
FROM node:20-slim

WORKDIR /app

# gosu lets the entrypoint drop from root to the `node` user after fixing
# volume permissions (see entrypoint.sh).
RUN apt-get update \
  && apt-get install -y --no-install-recommends gosu \
  && rm -rf /var/lib/apt/lists/*

# Install deps first so the layer caches when only source changes.
COPY package.json ./
RUN npm install --omit=dev

COPY server.js db.js ./
COPY data ./data
COPY public ./public
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Analytics DB lives here. Mount a volume at this path to persist it
# (docker-compose volume, or an Easypanel "Volume Mount" — see README).
ENV PORT=3000
ENV DB_DIR=/app/db
EXPOSE 3000

# Lightweight liveness check (no wget/curl needed on slim).
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Runs as root only long enough to chown the volume; entrypoint execs as node.
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]
