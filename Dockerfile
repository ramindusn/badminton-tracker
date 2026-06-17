# syntax=docker/dockerfile:1

# ---- Build stage -------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Build the static site. The container serves at the root, so override the
# GitHub Pages base path with "/".
COPY . .
RUN npm run build -- --base=/

# ---- Runtime stage -----------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# SPA-friendly nginx config (history fallback to index.html).
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Basic container healthcheck.
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
