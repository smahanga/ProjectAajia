FROM node:20-alpine
WORKDIR /workspace

# Copy workspace manifests (lockfile lives at root, shared across workspaces).
COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
# Needed so `apps/*` workspace glob doesn't error on missing apps/web manifest.
COPY apps/web/package*.json ./apps/web/

# Install all workspace deps (web's dev deps come along; harmless on the server).
RUN npm ci

# Bring in source for shared + api only (no web source needed in this image).
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared (emits dist/) then api.
RUN npm run build --workspace=@aajia/shared
RUN npm run build --workspace=@aajia/api

# Run from the api workspace so dist/migrate.js can find ../migrations.
WORKDIR /workspace/apps/api
CMD ["sh", "-c", "node dist/migrate.js && node dist/server.js"]
