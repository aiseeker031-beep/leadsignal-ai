# LeadSignal CRM — fullstack Next.js container (linux/arm64)
FROM --platform=linux/arm64 node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM --platform=linux/arm64 node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM --platform=linux/arm64 node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY package.json next.config.ts ./
EXPOSE 8080
CMD ["sh","-c","node_modules/.bin/next start -p ${PORT:-8080} -H 0.0.0.0"]
