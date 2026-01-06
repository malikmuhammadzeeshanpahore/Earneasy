### Frontend Dockerfile - multi-stage build
FROM node:18-alpine AS build
WORKDIR /app

# Copy package files and install
COPY frontend/package*.json ./
RUN npm ci --silent

# Copy source
COPY frontend/ .

# Allow build-time API base (Vite expects VITE_ prefixed vars)
ARG VITE_API_BASE
ENV VITE_API_BASE=${VITE_API_BASE:-/api}

RUN npm run build

### Production stage (nginx)
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config for SPA fallback if provided
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
