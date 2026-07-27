FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/runtime-contracts/package.json packages/runtime-contracts/package.json
RUN npm ci

FROM deps AS build
COPY apps/api apps/api
COPY packages/runtime-contracts packages/runtime-contracts
RUN npm run build:runtime && npm run build -w apps/api

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/runtime-contracts/package.json packages/runtime-contracts/package.json
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/packages/runtime-contracts/package.json /app/packages/runtime-contracts/package.json
COPY --from=build /app/packages/runtime-contracts/dist /app/packages/runtime-contracts/dist
COPY --from=build /app/packages/runtime-contracts/schemas /app/packages/runtime-contracts/schemas
COPY --from=build /app/apps/api/dist /app/dist
COPY --from=build /app/apps/api/scripts /app/scripts
COPY --from=build /app/apps/api/sql /app/sql
COPY --from=build /app/apps/api/certs /app/certs
COPY --from=build /app/apps/api/media /app/media
COPY --from=build /app/apps/api/data/quiz-bank /app/data/quiz-bank
COPY --from=build /app/apps/api/data/curriculum /app/data/curriculum
COPY --from=build /app/apps/api/data/learning-content /app/data/learning-content
COPY apps/web/privacy /app/legal/privacy
COPY apps/web/policy /app/legal/policy
COPY apps/web/terms /app/legal/terms
COPY apps/web/deletion /app/legal/deletion
COPY apps/web/legal.css /app/legal/legal.css
COPY apps/web/assets/kitabu-icon-bold-192.png /app/legal/assets/kitabu-icon-bold-192.png
COPY apps/web/assets/kitabu-favicon-bold.ico /app/legal/assets/kitabu-favicon-bold.ico
COPY native-app/src/assets/mascot/sungura-rabbit.png /app/legal/assets/mascot/sungura-rabbit.png
COPY native-app/src/assets/mascot/simba-lion.png /app/legal/assets/mascot/simba-lion.png
COPY native-app/src/assets/mascot/ndovu-elephant.png /app/legal/assets/mascot/ndovu-elephant.png
COPY apps/web/assets/fonts/bricolage-grotesque-latin.woff2 /app/legal/assets/fonts/bricolage-grotesque-latin.woff2
COPY apps/web/assets/fonts/plus-jakarta-sans-latin.woff2 /app/legal/assets/fonts/plus-jakarta-sans-latin.woff2
RUN mkdir -p /app/data/books
COPY --from=build /app/apps/api/package.json /app/package.json
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD wget -qO- http://127.0.0.1:4000/health || exit 1
CMD ["node", "dist/index.js"]
