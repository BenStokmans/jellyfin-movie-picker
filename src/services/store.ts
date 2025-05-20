// Store for managing application state
import { create } from 'zustand';
import { User, Lobby, Movie, MovieSession } from '@/types';

interface AppState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  
  // Jellyfin server settings
  serverUrl: string;
  setServerUrl: (url: string) => void;
  
  // Lobby state
  currentLobby: Lobby | null;
  setCurrentLobby: (lobby: Lobby | null) => void;
  
  // Movie session state
  movieSession: MovieSession | null;
  setMovieSession: (session: MovieSession | null) => void;
  
  // Movie data
  movies: Movie[];
  setMovies: (movies: Movie[]) => void;
  
  // Current movie being displayed
  currentMovieIndex: number;
  setCurrentMovieIndex: (index: number) => void;
  currentMovie: Movie | null;
  
  // Reset state
  resetState: () => void;
}

export const useAppStore = create<AppState>((set, get) => {
  const persistedUser = JSON.parse(localStorage.getItem('jellyfinUser') || 'null');
  return {
    // Auth state
    user: persistedUser,
    isAuthenticated: !!persistedUser,
    setUser: (user) => {
      if (user) {
        localStorage.setItem('jellyfinUser', JSON.stringify(user));
      } else {
        localStorage.removeItem('jellyfinUser');
      }
      set({ user, isAuthenticated: !!user });
    },
    
    // Jellyfin server settings
    serverUrl: localStorage.getItem('jellyfinServerUrl') || '',
    setServerUrl: (url) => {
      localStorage.setItem('jellyfinServerUrl', url);
      set({ serverUrl: url });
    },
    
    // Lobby state
    currentLobby: null,
    setCurrentLobby: (lobby) => set({ currentLobby: lobby }),
    
    // Movie session state
    movieSession: null,
    setMovieSession: (session) => set({ movieSession: session }),
    
    // Movie data
    movies: [],
    setMovies: (movies) => set({ movies }),
    
    // Current movie
    currentMovieIndex: 0,
    setCurrentMovieIndex: (index) => set({ currentMovieIndex: index }),
    get currentMovie() {
      const { movies, currentMovieIndex } = get();
      return movies.length > currentMovieIndex ? movies[currentMovieIndex] : null;
    },
    
    // Reset state
    resetState: () => set({
      currentLobby: null,
      movieSession: null,
      movies: [],
      currentMovieIndex: 0
    })
  };
});
