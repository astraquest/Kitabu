FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci

FROM deps AS build
COPY apps/api apps/api
RUN npm run build -w apps/api

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/dist /app/dist
COPY --from=build /app/apps/api/scripts /app/scripts
COPY --from=build /app/apps/api/sql /app/sql
COPY --from=build /app/apps/api/certs /app/certs
COPY --from=build /app/apps/api/data/quiz-bank /app/data/quiz-bank
COPY apps/web/privacy /app/legal/privacy
COPY apps/web/policy /app/legal/policy
COPY apps/web/terms /app/legal/terms
COPY apps/web/deletion /app/legal/deletion
RUN mkdir -p /app/data/books
COPY --from=build /app/apps/api/package.json /app/package.json
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD wget -qO- http://127.0.0.1:4000/health || exit 1
CMD ["node", "dist/index.js"]
