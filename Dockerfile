# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm ci --legacy-peer-deps

RUN npx prisma generate
COPY backend/tsconfig.json backend/nest-cli.json ./
COPY backend/src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV RUN_MIGRATIONS_ON_START=true
ENV HEALTH_CHECK_DB=false

RUN apk add --no-cache openssl wget

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY backend/public ./public

EXPOSE 3000

# Apply committed Prisma migrations before starting the Render service.
CMD ["sh", "-c", "if [ \"${RUN_MIGRATIONS_ON_START:-false}\" = \"true\" ]; then npx prisma migrate deploy; fi && node dist/main.js"]
