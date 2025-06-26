FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy server files 
COPY server/ ./server/

# Create required directories
RUN mkdir -p server/logs server/data/thumbnails server/data/streams server/data/cache

# Set environment variables
ENV NODE_ENV production

# Expose the Plex-like default port
EXPOSE 32400

# Start the server
CMD ["npm", "start"]
