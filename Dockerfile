FROM oven/bun:1

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
COPY server/package.json ./server/

# Install dependencies
RUN bun install
RUN cd server && bun install

# Copy source files
COPY . .

# Build the client and server
RUN bun run build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start the server
CMD ["bun", "run", "start"]
