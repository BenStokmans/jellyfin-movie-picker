// Server for the Jellyfin Movie Picker application
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import axios, { AxiosError } from "axios";

// Types (duplicated from client for simplicity)
interface User {
  id: string;
  name: string;
  jellyfinUserId: string;
  jellyfinAccessToken: string;
}

interface Lobby {
  id: string;
  name: string;
  creatorId: string;
  participants: User[];
  status: "waiting" | "picking" | "completed";
  selectedMovieId?: string;
  inviteCode: string;
}

interface Movie {
  id: string;
  name: string;
  overview: string;
  posterUrl: string;
  year: number;
  runtime: number;
  genres: string[];
}

interface MovieSession {
  lobbyId: string;
  movies: Movie[];
  currentMovieIndex: number;
  votes: Record<string, Record<string, "yes" | "no">>; // movieId -> userId -> vote
  matchedMovieId?: string;
}

// In-memory database
const lobbies: Record<string, Lobby> = {};
const inviteCodes: Record<string, string> = {}; // inviteCode -> lobbyId
const sessions: Record<string, MovieSession> = {};
const userRooms: Record<string, string> = {}; // userId -> lobbyId

// Create Express app
const app = express();
app.use(cors({
  origin: process.env.NODE_ENV === "production" 
    ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : "*")
    : "*",
  credentials: true,
}));
app.use(express.json());

// Create HTTP server from Express app
const server = http.createServer(app);

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" 
      ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : "*")
      : "*", // In production, replace with your actual domain
    methods: ["GET", "POST"],
    credentials: true,
  },
});


// Add version API endpoint
app.get("/api/version", (req, res) => {
  res.status(200).json({
    name: "jellyfin-movie-picker",
    version: "1.0.0",
    serverVersion: "1.0.0",
  });
});

// Jellyfin API proxy to bypass CORS restrictions
app.use("/api/jellyfin-proxy", async (req, res) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`[Jellyfin Proxy ${requestId}] Incoming request: ${req.method} ${req.url}`);
  console.log(`[Jellyfin Proxy ${requestId}] Origin: ${req.headers.origin || 'NOT PROVIDED'}`);
  console.log(`[Jellyfin Proxy ${requestId}] User-Agent: ${req.headers['user-agent'] || 'NOT PROVIDED'}`);
  
  try {
    // Extract Jellyfin server URL from header or query (case-insensitive)
    let jellyfinUrl = req.headers["x-jellyfin-url"] as string || 
                      req.headers["X-Jellyfin-Url"] as string ||
                      req.headers["X-JELLYFIN-URL"] as string;
    
    if (!jellyfinUrl && req.query.jellyfinUrl) {
      jellyfinUrl = req.query.jellyfinUrl as string;
    }
    
    console.log(`[Jellyfin Proxy ${requestId}] Jellyfin URL: ${jellyfinUrl || 'NOT PROVIDED'}`);
    
    if (!jellyfinUrl) {
      console.log(`[Jellyfin Proxy ${requestId}] Error: Missing Jellyfin server URL`);
      return res.status(400).json({ error: "Missing Jellyfin server URL" });
    }

    // Build target URL, stripping out jellyfinUrl query param
    const [path, query] = req.url.split('?');
    const params = new URLSearchParams(query || '');
    params.delete('jellyfinUrl');
    const finalPath = path + (params.toString() ? '?' + params.toString() : '');
    const targetUrl = `${jellyfinUrl}${finalPath}`;

    console.log(`[Jellyfin Proxy ${requestId}] Target URL: ${targetUrl}`);

    // Copy original headers but remove proxy-specific ones and Cloudflare headers
    const headers = { ...req.headers };
    delete headers.host;
    delete headers['x-jellyfin-url'];
    delete headers['X-Jellyfin-Url'];
    delete headers['X-JELLYFIN-URL'];
    
    // Remove Cloudflare headers that might interfere
    delete headers['cf-connecting-ip'];
    delete headers['cf-ipcountry'];
    delete headers['cf-ray'];
    delete headers['cf-visitor'];
    delete headers['cf-warp-tag-id'];
    delete headers['cdn-loop'];
    
    // Remove forwarded headers that might confuse the target server
    delete headers['x-forwarded-for'];
    delete headers['x-forwarded-host'];
    delete headers['x-forwarded-port'];
    delete headers['x-forwarded-proto'];
    delete headers['x-forwarded-server'];
    delete headers['x-real-ip'];

    console.log(`[Jellyfin Proxy ${requestId}] Request headers:`, Object.keys(headers));
    console.log(`[Jellyfin Proxy ${requestId}] Auth header present: ${!!headers.authorization}`);
    console.log(`[Jellyfin Proxy ${requestId}] X-Emby-Authorization present: ${!!headers['x-emby-authorization']}`);
    console.log(`[Jellyfin Proxy ${requestId}] X-Emby-Token present: ${!!headers['x-emby-token']}`);

    if (req.method !== 'GET' && req.body) {
      console.log(`[Jellyfin Proxy ${requestId}] Request body size: ${JSON.stringify(req.body).length} bytes`);
      console.log(`[Jellyfin Proxy ${requestId}] Request body preview:`, JSON.stringify(req.body).substring(0, 200));
    }

    const startTime = Date.now();
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers,
      data: req.method !== 'GET' ? req.body : undefined,
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
      maxRedirects: 5,
      validateStatus: (status) => status < 600, // Don't throw on 4xx/5xx, let proxy handle it
    });

    const duration = Date.now() - startTime;
    console.log(`[Jellyfin Proxy ${requestId}] Response received: ${response.status} (${duration}ms)`);
    console.log(`[Jellyfin Proxy ${requestId}] Response headers:`, Object.keys(response.headers));
    console.log(`[Jellyfin Proxy ${requestId}] Response size: ${response.data.byteLength} bytes`);

    // Forward the response back to the client
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value as string);
    });

    // Handle different content types properly
    const contentType = response.headers['content-type'] || '';
    console.log(`[Jellyfin Proxy ${requestId}] Content-Type: ${contentType}`);
    
    if (contentType.includes('application/json')) {
      // For JSON responses, convert ArrayBuffer to JSON and send as JSON
      try {
        const jsonData = JSON.parse(Buffer.from(response.data).toString('utf-8'));
        console.log(`[Jellyfin Proxy ${requestId}] JSON response preview:`, JSON.stringify(jsonData).substring(0, 200));
        res.status(response.status).json(jsonData);
      } catch (parseError) {
        console.error(`[Jellyfin Proxy ${requestId}] JSON parse error:`, parseError);
        const rawText = Buffer.from(response.data).toString('utf-8');
        console.error(`[Jellyfin Proxy ${requestId}] Raw response text:`, rawText.substring(0, 500));
        res.status(response.status).send(response.data);
      }
    } else {
      // For other responses (images, etc.), send as buffer
      res.status(response.status).send(response.data);
    }
    console.log(`[Jellyfin Proxy ${requestId}] Request completed successfully`);
  } catch (error) {
    const err = error as AxiosError;
    console.error(`[Jellyfin Proxy ${requestId}] Error occurred:`, err.message);
    console.error(`[Jellyfin Proxy ${requestId}] Error code:`, err.code);
    console.error(`[Jellyfin Proxy ${requestId}] Request config:`, {
      method: err.config?.method,
      url: err.config?.url,
      timeout: err.config?.timeout,
    });
    
    // log content of response if available
    if (err.response) {
      console.error(`[Jellyfin Proxy ${requestId}] Error status:`, err.response.status);
      console.error(`[Jellyfin Proxy ${requestId}] Error headers:`, Object.keys(err.response.headers));
      
      const responseBuffer = Buffer.from(err.response.data as ArrayBuffer);
      const responseString = responseBuffer.toString("utf-8");
      console.error(`[Jellyfin Proxy ${requestId}] Error response body:`, responseString);
    } else {
      console.error(`[Jellyfin Proxy ${requestId}] No response received from Jellyfin server`);
    }
    
    res.status(err.response?.status || 500).json({
      error: "Failed to proxy request to Jellyfin",
      details: err.message,
      requestId,
    });
  }
});

// Integration with Vite for development or serve static files in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (process.env.NODE_ENV === "production") {
  console.log("Running in production mode");
  const clientDistPath = path.join(__dirname, "../../dist");
  console.log("Serving static files from:", clientDistPath);

  app.use(express.static(clientDistPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
} else {
  console.log("Running in development mode");
  const setupViteMiddleware = async () => {
    const { createServer } = await import("vite");
    try {
      const vite = await createServer({
        root: path.join(__dirname, ".."),
        server: {
          middlewareMode: true,
          hmr: {
            server, // Pass our HTTP server to Vite for HMR
          },
        },
        appType: "spa",
      });

      app.use(vite.middlewares);

      app.use("*", async (req, res, next) => {
        // For API routes, continue to next middleware
        if (req.originalUrl.startsWith("/api/")) {
          return next();
        }

        try {
          // Always read the index.html
          let template = fs.readFileSync(
            path.join(__dirname, "../index.html"),
            "utf-8"
          );

          // Apply Vite HTML transforms
          template = await vite.transformIndexHtml(req.originalUrl, template);

          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (e) {
          const err = e as Error;
          vite.ssrFixStacktrace(err);
          console.error(err);
          res.status(500).end(err.stack);
        }
      });
    } catch (e) {
      console.error("Error setting up Vite middleware:", e);
    }
  };

  setupViteMiddleware();
}

// Socket.IO events
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Create a new lobby
  socket.on("create-lobby", ({ creatorUser, name }, callback) => {
    try {
      const lobbyId = uuidv4();
      const inviteCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      const lobby: Lobby = {
        id: lobbyId,
        name,
        creatorId: creatorUser.id,
        participants: [creatorUser],
        status: "waiting",
        inviteCode,
      };

      // Store in our "database"
      lobbies[lobbyId] = lobby;
      inviteCodes[inviteCode] = lobbyId;

      // Join socket room for this lobby
      socket.join(lobbyId);

      callback({ success: true, lobby });
    } catch (error) {
      console.error("Error creating lobby:", error);
      callback({ success: false, error: "Failed to create lobby" });
    }
  });

  // Join a lobby with invite code
  socket.on("join-lobby-code", ({ user, inviteCode }, callback) => {
    try {
      const lobbyId = inviteCodes[inviteCode];
      
      if (!lobbyId || !lobbies[lobbyId]) {
        return callback({ success: false, error: "Invalid invite code" });
      }

      // Add to socket.io room
      socket.join(lobbyId);

      // Store userId for authentication
      if (user.id) {
        userRooms[user.id] = lobbyId;
      }

      // Add to participants if not already there
      const lobby = lobbies[lobbyId];
      const exists = lobby.participants.some((p) => p.id === user.id);

      if (!exists) {
        lobby.participants.push(user);
      }
      
      // Get existing session if it exists
      const session = sessions[lobbyId];

      // Notify all clients in the lobby
      io.to(lobbyId).emit("lobby-update", lobby);
      
      // Send active session to the newly joined user if one exists
      if (session && lobby.status === 'picking') {
        socket.emit("session-update", session);
      }

      callback({ success: true, lobby });
    } catch (error) {
      console.error("Error joining lobby:", error);
      callback({ success: false, error: "Failed to join lobby" });
    }
  });

  // Join lobby 
  socket.on("join-lobby", ({ user, lobbyId }, callback) => {
    try {
      if (!lobbyId || !lobbies[lobbyId]) {
        return callback({ success: false, error: "Lobby not found" });
      }

      // Add to socket.io room
      socket.join(lobbyId);

      // Store userId for authentication
      if (user.id) {
        userRooms[user.id] = lobbyId;
      }

      // Add to participants if not already there
      const lobby = lobbies[lobbyId];
      const exists = lobby.participants.some((p) => p.id === user.id);

      if (!exists) {
        lobby.participants.push(user);
      }
      
      // Get existing session if it exists
      const session = sessions[lobbyId];

      // Notify all clients in the lobby
      io.to(lobbyId).emit("lobby-update", lobby);
      
      // Send active session to the newly joined user if one exists
      if (session && lobby.status === 'picking') {
        socket.emit("session-update", session);
      }

      callback({ success: true, lobby });
    } catch (error) {
      console.error("Error joining lobby:", error);
      callback({ success: false, error: "Failed to join lobby" });
    }
  });

  // Start movie session
  socket.on("start-session", ({ lobbyId, movies }, callback) => {
    try {
      const lobby = lobbies[lobbyId];

      if (!lobby) {
        return callback({ success: false, error: "Lobby not found" });
      }

      // Update lobby status
      lobby.status = "picking";

      // Initialize session
      const session: MovieSession = {
        lobbyId,
        movies,
        currentMovieIndex: 0,
        votes: {},
      };

      // Initialize votes for each movie
      movies.forEach((movie) => {
        session.votes[movie.id] = {};
      });

      // Store in our "database"
      sessions[lobbyId] = session;

      // Notify all clients in the lobby
      io.to(lobbyId).emit("lobby-update", lobby);
      io.to(lobbyId).emit("session-update", session);

      callback({ success: true });
    } catch (error) {
      console.error("Error starting session:", error);
      callback({ success: false, error: "Failed to start session" });
    }
  });

  // Submit vote
  socket.on("submit-vote", ({ lobbyId, userId, movieId, vote }, callback) => {
    try {
      const session = sessions[lobbyId];

      if (!session) {
        return callback({ success: false, error: "Session not found" });
      }

      // Record vote
      if (!session.votes[movieId]) {
        session.votes[movieId] = {};
      }

      session.votes[movieId][userId] = vote;

      // Check for match
      const lobby = lobbies[lobbyId];

      if (lobby) {
        const allVotedYes = lobby.participants.every(
          (p) => session.votes[movieId][p.id] === "yes"
        );

        if (allVotedYes) {
          // We have a match!
          lobby.status = "completed";
          lobby.selectedMovieId = movieId;
          session.matchedMovieId = movieId;

          // Notify all clients in the lobby about both lobby and session update
          io.to(lobbyId).emit("lobby-update", lobby);
          io.to(lobbyId).emit("session-update", session);
          
          callback({ success: true });
          return;
        }
      }

      // Notify all clients in the lobby about session update
      io.to(lobbyId).emit("session-update", session);

      callback({ success: true });
    } catch (error) {
      console.error("Error submitting vote:", error);
      callback({ success: false, error: "Failed to submit vote" });
    }
  });

  // Leave lobby
  socket.on("leave-lobby", ({ userId, lobbyId }, callback) => {
    try {
      const lobby = lobbies[lobbyId];

      if (!lobby) {
        return callback({ success: true }); // Lobby already doesn't exist
      }

      // Remove user from participants
      const updatedParticipants = lobby.participants.filter(
        (p) => p.id !== userId
      );

      if (updatedParticipants.length === 0) {
        // If no participants left, delete the lobby
        delete lobbies[lobbyId];

        // Remove invite code mapping
        Object.keys(inviteCodes).forEach((code) => {
          if (inviteCodes[code] === lobbyId) {
            delete inviteCodes[code];
          }
        });

        // Remove session
        delete sessions[lobbyId];
      } else {
        // Update participants
        lobby.participants = updatedParticipants;

        // If the creator left, assign new creator
        if (lobby.creatorId === userId) {
          lobby.creatorId = updatedParticipants[0].id;
        }

        // Notify all clients in the lobby
        io.to(lobbyId).emit("lobby-update", lobby);
      }

      // Leave socket room
      socket.leave(lobbyId);

      callback({ success: true });
    } catch (error) {
      console.error("Error leaving lobby:", error);
      callback({ success: false, error: "Failed to leave lobby" });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default server;
