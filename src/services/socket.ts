// Socket.IO service for real-time data
import { io, Socket } from "socket.io-client";
import { Lobby, User, Movie, MovieSession } from "@/types";

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;

  // Set the user ID
  setUserId(userId: string): void {
    this.userId = userId;
  }

  // Get the user ID
  getUserId(): string | null {
    return this.userId;
  }

  // Clear the user ID (for logout)
  clearUserId(): void {
    this.userId = null;
  }

  // Connect to the socket server
  connect(serverUrl?: string): void {
    if (this.socket) {
      this.socket.disconnect();
    }

    // Connect to the same server that hosts the app
    // This works because we're running a single server for both client and API
    const options = {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      auth: this.userId ? { userId: this.userId } : undefined
    };
    
    this.socket = io(serverUrl || window.location.origin, options);
    
    this.socket.on("connect", () => {
      console.log("Connected to socket server");
    });
    
    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log(`Reconnected to socket server after ${attemptNumber} attempts`);
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("Socket reconnection error:", error);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("Socket reconnection failed after all attempts");
    });
  }

  // Disconnect from the socket server
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Create a new lobby
  async createLobby(creatorUser: User, name: string): Promise<Lobby> {
    if (!this.socket) throw new Error("Socket not connected");
    
    // Update the stored user ID if it's not already set
    if (!this.userId && creatorUser.id) {
      this.setUserId(creatorUser.id);
    }
    
    return new Promise((resolve, reject) => {
      this.socket!.emit("create-lobby", { creatorUser, name }, (response: { success: boolean; lobby?: Lobby; error?: string }) => {
        if (response.success && response.lobby) {
          resolve(response.lobby);
        } else {
          reject(new Error(response.error || "Failed to create lobby"));
        }
      });
    });
  }

  // Join a lobby using an invite code
  async joinLobbyWithCode(user: User, inviteCode: string): Promise<Lobby> {
    if (!this.socket) throw new Error("Socket not connected");
    
    // Update the stored user ID if it's not already set
    if (!this.userId && user.id) {
      this.setUserId(user.id);
    }
    
    return new Promise((resolve, reject) => {
      this.socket!.emit("join-lobby-code", { user, inviteCode }, (response: { success: boolean; lobby?: Lobby; error?: string }) => {
        if (response.success && response.lobby) {
          resolve(response.lobby);
        } else {
          reject(new Error(response.error || "Failed to join lobby"));
        }
      });
    });
  }

  // Join a lobby using lobby ID
  async joinLobby(user: User, lobbyId: string): Promise<Lobby> {
    if (!this.socket) throw new Error("Socket not connected");
    
    // Update the stored user ID if it's not already set
    if (!this.userId && user.id) {
      this.setUserId(user.id);
    }
    
    return new Promise((resolve, reject) => {
      this.socket!.emit("join-lobby", { user, lobbyId }, (response: { success: boolean; lobby?: Lobby; error?: string }) => {
        if (response.success && response.lobby) {
          resolve(response.lobby);
        } else {
          reject(new Error(response.error || "Failed to join lobby"));
        }
      });
    });
  }

  // Start the movie selection session
  async startMovieSession(lobbyId: string, movies: Movie[]): Promise<void> {
    if (!this.socket) throw new Error("Socket not connected");
    
    return new Promise((resolve, reject) => {
      this.socket!.emit("start-session", { lobbyId, movies }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || "Failed to start movie session"));
        }
      });
    });
  }

  // Submit a vote for a movie
  async submitVote(lobbyId: string, userId: string | null = null, movieId: string, vote: 'yes' | 'no'): Promise<void> {
    if (!this.socket) throw new Error("Socket not connected");
    
    // Use provided userId if given, otherwise fall back to the stored userId
    const effectiveUserId = userId || this.userId;
    if (!effectiveUserId) throw new Error("User ID is not set");
    
    return new Promise((resolve, reject) => {
      this.socket!.emit("submit-vote", { lobbyId, userId: effectiveUserId, movieId, vote }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || "Failed to submit vote"));
        }
      });
    });
  }

  // Listen for changes in a lobby
  onLobbyChange(callback: (lobby: Lobby) => void): () => void {
    if (!this.socket) throw new Error("Socket not connected");
    
    this.socket.on("lobby-update", callback);
    
    return () => {
      this.socket?.off("lobby-update", callback);
    };
  }

  // Listen for changes in a movie session
  onSessionChange(callback: (session: MovieSession) => void): () => void {
    if (!this.socket) throw new Error("Socket not connected");
    
    this.socket.on("session-update", callback);
    
    return () => {
      this.socket?.off("session-update", callback);
    };
  }

  // Leave a lobby
  async leaveLobby(userId: string | null = null, lobbyId: string): Promise<void> {
    if (!this.socket) throw new Error("Socket not connected");
    
    // Use provided userId if given, otherwise fall back to the stored userId
    const effectiveUserId = userId || this.userId;
    if (!effectiveUserId) throw new Error("User ID is not set");
    
    return new Promise((resolve, reject) => {
      this.socket!.emit("leave-lobby", { userId: effectiveUserId, lobbyId }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || "Failed to leave lobby"));
        }
      });
    });
  }
}

export const socketService = new SocketService();
