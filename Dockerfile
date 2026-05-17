# Use Node 20 alpine for a lightweight image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including dev for the build)
RUN npm install

# Copy the rest of the backend code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the TypeScript code
RUN npm run build

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]