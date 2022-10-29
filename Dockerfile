# Name the node stage "builder"
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy our node module specification
COPY package.json package.json
COPY package-lock.json package-lock.json
ENV NODE_OPTIONS=--openssl-legacy-provider
# install node modules and build assets
RUN npm ci

# Copy all files from current directory to working dir in image
# Except the one defined in '.dockerignore'
COPY . .

# Create production build of React App
RUN npm run build

# Choose NGINX as our base Docker image
FROM nginx:alpine

# Set working directory to nginx asset directory
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf *

# Copy static assets from builder stage
COPY --from=builder /app/build .

# Entry point when Docker container has started
ENTRYPOINT ["nginx", "-g", "daemon off;"]