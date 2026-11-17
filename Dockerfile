FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./

RUN npm ci --omit=dev

COPY server ./server
COPY client ./client

EXPOSE 8080

USER node

CMD ["npm", "start"]
