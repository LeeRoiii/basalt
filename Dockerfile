# --- Client Stage ---
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build

# --- Server Stage ---
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ .
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine
WORKDIR /app

# Install security updates
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

# Copy client dist
COPY --from=client-build /app/client/dist ./client/dist

# Copy server build and dependencies
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/package*.json ./server/
COPY --from=server-build /app/server/node_modules ./server/node_modules

# Create uploads directory
RUN mkdir -p /app/server/uploads

WORKDIR /app/server
EXPOSE 5000

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
