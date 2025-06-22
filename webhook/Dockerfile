# Use official Node.js LTS image
FROM node:18-alpine AS builder

# Install curl for healthcheck
RUN apk --no-cache add curl

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user and set permissions
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /usr/src/app

# Use non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application using node directly
# In production, you might want to use a process manager like PM2 instead
CMD ["node", "dyes_server.js"]
