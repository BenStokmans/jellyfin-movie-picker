# Jellyfin Movie Picker

A Tinder-style movie picker application for Jellyfin users to decide on a movie to watch together.

## Features

- Authentication with Jellyfin server
- Create and join lobbies with invite links
- Fetch movies from your Jellyfin library
- Tinder-style swiping interface
- Real-time synchronization between all users
- Find the perfect movie that everyone in the group agrees on

## Technology Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, Socket.IO
- **APIs**: Jellyfin SDK

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- A running Jellyfin server with movies

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/jellyfin-movie-picker.git
   cd jellyfin-movie-picker
   ```

2. Install dependencies for both the client and server:
   ```bash
   # Install client dependencies
   npm install
   
   # Install server dependencies
   cd server
   npm install
   cd ..
   ```

3. Create a `.env` file in the server directory (optional):
   ```bash
   # Navigate to server directory
   cd server
   
   # Copy example environment file
   cp ../.env.example .env
   
   # Edit as needed
   nano .env
   ```

### Running the Application

1. Start the development server (which also serves the client):
   ```bash
   # Use the starter script (recommended)
   npm start
   
   # Or run the server directly
   cd server
   npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Building for Production

1. Build both client and server:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start
   ```

## How to Use

1. **Login**: Enter your Jellyfin server URL and login credentials
2. **Create a Lobby**: Create a new lobby and share the invite code with friends
3. **Join a Lobby**: Others can join using the invite code
4. **Start Movie Picking**: The lobby creator can start the movie selection process
5. **Swipe on Movies**: Everyone swipes left (dislike) or right (like) on each movie
6. **Find a Match**: When everyone likes the same movie, it's a match!

## Self-Hosting

This application is designed to be self-hosted, with no dependency on external paid services. The server handles both the API/WebSocket communication and serving the web application on a single port, making it easy to deploy.

### Deployment Options

#### Docker (Recommended)

1. Create a `Dockerfile` in the root directory:
   ```bash
   # Create Dockerfile
   cat > Dockerfile << 'EOF'
   FROM node:18-slim

   WORKDIR /app

   # Copy package files
   COPY package*.json ./
   COPY server/package*.json ./server/

   # Install dependencies
   RUN npm install
   RUN cd server && npm install

   # Copy source files
   COPY . .

   # Build the client and server
   RUN npm run build

   # Set environment variables
   ENV NODE_ENV=production
   ENV PORT=3000

   # Expose the port
   EXPOSE 3000

   # Start the server
   CMD ["npm", "run", "start"]
   EOF
   ```

2. Build and run the Docker container:
   ```bash
   docker build -t jellyfin-movie-picker .
   docker run -p 3000:3000 jellyfin-movie-picker
   ```

#### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Copy the build files to your server:
   ```bash
   # Example using rsync
   rsync -av --exclude="node_modules" ./ user@your-server:/path/to/app/
   ```

3. Install production dependencies on your server:
   ```bash
   npm ci --production
   cd server
   npm ci --production
   ```

4. Start the server:
   ```bash
   npm run start
   ```

### Customizing the Port

By default, the application runs on port 3000. You can change this by setting the `PORT` environment variable:

```bash
# Set port to 8080
PORT=8080 npm run start

# Or persist it
export PORT=8080
npm run start
```

When using Docker, you can set the port using the `-p` flag and the environment variable:

```bash
# Run on port 8080
docker run -p 8080:8080 -e PORT=8080 jellyfin-movie-picker
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
