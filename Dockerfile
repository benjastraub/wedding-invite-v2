# ---------- Build stage ----------
# All dev tooling (TypeScript, Vite, tsx, vitest) lives here and is never
# copied into the final image.
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci

COPY shared shared
COPY server server
COPY client client
RUN npm run build

# ---------- Runtime stage ----------
# Only the 6 production dependencies + compiled output.
FROM node:22-slim
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist

EXPOSE 8080
CMD ["node", "server/dist/index.js"]
