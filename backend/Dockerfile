FROM node:18-alpine
WORKDIR /app

# Copy package and install production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production --silent || npm install --silent

# Copy backend source
COPY backend/ .

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "index.js"]
