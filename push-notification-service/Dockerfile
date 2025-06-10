# Build stage
FROM node:22-alpine AS builder

# Install yarn if not available
RUN corepack enable

WORKDIR /app

# Copy package files
COPY package.json yarn.lock tsconfig.json tsconfig.build.json ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code and public assets
COPY src ./src
COPY public ./public

# Build the application
RUN yarn build

# Production stage
FROM node:22-alpine

# Install yarn if not available
RUN corepack enable

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install production dependencies only
RUN yarn install --frozen-lockfile --production

# Copy built application and public assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY ./openapi.yaml ./openapi.yaml

EXPOSE 3000

CMD ["node", "dist/server.js"]