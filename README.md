# DISCLAIMER: This entire project was created using Github Copilot Agent mode with Claude 3.7 Sonnet
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
- **Backend**: Bun, Express, Socket.IO
- **APIs**: Jellyfin SDK

## Setup Instructions

### Prerequisites

- Bun (v1.0 or higher)
- A running Jellyfin server with movies

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/BenStokmans/jellyfin-movie-picker.git
   cd jellyfin-movie-picker
   ```

2. Install dependencies for both the client and server:
   ```bash
   # Install client dependencies
   bun install
   
   # Install server dependencies
   cd server
   bun install
   cd ..
   ```

### Running the Application

1. Start the development server (which also serves the client):
   ```bash
   bun run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3001
   ```

### Building for Production

1. Build both client and server:
   ```bash
   bun run build
   ```

2. Start the production server:
   ```bash
   bun run start
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
2. Build and run the Docker container:
   ```bash
   docker compose build
   docker compose up -d
   ```

### Customizing the Port

By default, the application runs on port 3000. You can change this by setting the `PORT` environment variable:

```bash
# Set port to 8080
PORT=8080 bun run start

# Or persist it
export PORT=8080
bun run start
```

When using Docker, you can set the port using the `-p` flag and the environment variable:

```bash
# Run on port 8080
docker run -p 8080:8080 -e PORT=8080 jellyfin-movie-picker
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
