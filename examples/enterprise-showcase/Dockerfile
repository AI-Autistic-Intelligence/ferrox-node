# ==============================================================================
# 🚀 Ferrox-Node Enterprise Showcase - Multi-Stage Production Dockerfile
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools if native bindings needed
RUN apk add --no-cache python3 make g++

# Copy package manifests
COPY package.json package-lock.json* ./
COPY packages/ ./packages/
COPY examples/enterprise-showcase/ ./examples/enterprise-showcase/

# Install dependencies and build
RUN npm install
RUN npm run build --workspace=@ferrox-node/enterprise-showcase

# Production Runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app ./

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

CMD ["node", "examples/enterprise-showcase/dist/index.js"]
