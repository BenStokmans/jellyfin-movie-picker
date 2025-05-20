// Types for the application
export interface User {
  id: string;
  name: string;
  jellyfinUserId: string;
  jellyfinAccessToken: string;
}

export interface Lobby {
  id: string;
  name: string;
  creatorId: string;
  participants: User[];
  status: 'waiting' | 'picking' | 'completed';
  selectedMovieId?: string;
  inviteCode: string;
}

export interface Movie {
  id: string;
  name: string;
  overview: string;
  posterUrl: string;
  year: number;
  runtime: number;
  genres: string[];
}

export interface Vote {
  userId: string;
  movieId: string;
  vote: 'yes' | 'no';
}

export interface MovieSession {
  lobbyId: string;
  movies: Movie[];
  currentMovieIndex: number;
  votes: Record<string, Record<string, 'yes' | 'no'>>; // movieId -> userId -> vote
  matchedMovieId?: string;
}
