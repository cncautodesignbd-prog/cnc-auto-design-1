# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create data directory if it doesn't exist
RUN mkdir -p data

# Set permissions for data directory
RUN chmod -R 755 data

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
