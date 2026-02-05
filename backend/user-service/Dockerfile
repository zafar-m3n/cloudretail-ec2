# backend/user-service/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy source code
COPY . .

# Expose service port (for documentation)
EXPOSE 8080

# Start the service
CMD ["node", "server.js"]
