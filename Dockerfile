# Stage 1: Build / Install Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY server ./server
COPY client ./client

EXPOSE 8080

USER node

CMD ["npm", "start"]
