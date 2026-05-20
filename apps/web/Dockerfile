FROM node:20-alpine AS build
WORKDIR /workspace

COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/web/package*.json ./apps/web/
# Needed so workspace install doesn't choke on missing apps/api manifest.
COPY apps/api/package*.json ./apps/api/

RUN npm ci

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN npm run build --workspace=@aajia/shared

# Vite inlines import.meta.env.VITE_* at build time, so we need the API URL here.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build --workspace=@aajia/web

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve@14
COPY --from=build /workspace/apps/web/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
