// Movie Picker page with Tinder-style swiping
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socketService } from '@/services/socket';
import { useAppStore } from '@/services/store';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { MovieCard } from '@/components/MovieCard';
import { SwipeControls } from '@/components/SwipeControls';
import { type MovieSession } from '@/types';

export default function MoviePicker() {
  const navigate = useNavigate();
  const { user, currentLobby, setCurrentLobby, movies, movieSession, setMovieSession, setMovies, currentMovieIndex, setCurrentMovieIndex } = useAppStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userVote, setUserVote] = useState<'yes' | 'no' | null>(null);
  
  // Touch swipe functionality
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

    // Minimum required distance between touch start and touch end to be detected as swipe
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || loading) return;
    const distance = touchStart - touchEnd;
    const isSwipe = Math.abs(distance) > minSwipeDistance;
    if (isSwipe) {
      if (distance > 0) {
        handleVote('no');
      } else {
        handleVote('yes');
      }
    }
  };

  // Add debug logging for initial state
  useEffect(() => {
    console.log("MoviePicker initial state:", { 
      hasMovies: movies.length > 0,
      currentMovieIndex,
      movieSessionExists: !!movieSession
    });
  }, [movies.length, currentMovieIndex, movieSession]);

  // Redirect if no lobby or session not started
  useEffect(() => {
    if (!currentLobby || currentLobby.status !== 'picking') {
      navigate('/lobby');
    }
  }, [currentLobby, navigate]);

  // Set up session update listener
  useEffect(() => {
    if (!currentLobby) return;

    const unsubscribe = socketService.onSessionChange((updatedSession: MovieSession) => {
      setMovieSession(updatedSession);
      
      // Only update movies when first receiving them (empty array) or when joining a session in progress
      if (movies.length === 0) {
        setMovies(updatedSession.movies);
        // Start at index 0 when first receiving movies
        setCurrentMovieIndex(0);
      }
      
      // Check if this update includes a match notification
      if (updatedSession.matchedMovieId) {
        navigate('/result');
      }
    });

    return () => unsubscribe();
  }, [currentLobby, navigate, setMovieSession, setMovies, setCurrentMovieIndex, movies.length]);

  // Sync lobby updates in MoviePicker
  useEffect(() => {
    if (!currentLobby) return;
    const unsubscribeLobby = socketService.onLobbyChange((updatedLobby) => {
      setCurrentLobby(updatedLobby);
    });
    return () => unsubscribeLobby();
  }, [currentLobby, setCurrentLobby]);

  // Preload next 5 movie poster images for smoother UX
  useEffect(() => {
    const preloadCount = 5;
    const nextMovies = movies.slice(currentMovieIndex + 1, currentMovieIndex + 1 + preloadCount);
    nextMovies.forEach((movie) => {
      if (movie.posterUrl) {
        const img = new Image();
        img.src = movie.posterUrl;
      }
    });
  }, [currentMovieIndex, movies]);

  const handleVote = async (vote: 'yes' | 'no') => {
    if (!user || !currentLobby || !movieSession || currentMovieIndex >= movies.length) return;
    
    const currentMovie = movies[currentMovieIndex];
    setUserVote(vote);
    setLoading(true);
    
    try {
      await socketService.submitVote(
        currentLobby.id,
        user.id,
        currentMovie.id,
        vote
      );
      
      // Wait for the animation
      setTimeout(() => {
        // Move to next movie
        setCurrentMovieIndex(currentMovieIndex + 1);
        setUserVote(null);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Vote error:', error);
      setError('Failed to submit vote');
      setLoading(false);
    }
  };

  // User has viewed all movies
  if (currentMovieIndex >= movies.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <Card className="w-full max-w-lg">
          <CardContent className="flex flex-col items-center pt-6">
            <h2 className="text-2xl font-semibold mb-4">You've seen all movies!</h2>
            <p className="text-center mb-6">
              Waiting for others to finish voting or for a match to be found.
            </p>
            
            <div className="animate-pulse flex space-x-4">
              <div className="h-3 w-3 bg-primary rounded-full"></div>
              <div className="h-3 w-3 bg-primary rounded-full"></div>
              <div className="h-3 w-3 bg-primary rounded-full"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentMovie = movies[currentMovieIndex];
  
  if (!currentMovie) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center text-center">
        <h1 className="text-2xl font-bold mb-6">Pick a Movie</h1>
        
        <div 
          className={`w-full transition-transform duration-500 transform ${
            userVote === 'yes' ? 'translate-x-[120%]' : 
            userVote === 'no' ? 'translate-x-[-120%]' : 'translate-x-0'
          }`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Carousel className="w-full max-w-none sm:max-w-md md:max-w-xl lg:max-w-2xl mx-auto">
            <CarouselContent>
              <CarouselItem>
                <MovieCard movie={currentMovie} />
                <div className="text-center mt-2 text-sm text-muted-foreground">
                  <span>← Swipe left to skip</span>
                  <span className="mx-2">|</span>
                  <span>Swipe right to like →</span>
                </div>
              </CarouselItem>
            </CarouselContent>
          </Carousel>
        </div>
        
        <div className="mt-6 w-full">
          <SwipeControls 
            onSwipeLeft={() => handleVote('no')} 
            onSwipeRight={() => handleVote('yes')} 
            disabled={loading}
          />
        </div>
        
        <div className="mt-4 w-full">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Movie {currentMovieIndex + 1} of {movies.length}
            </span>
            {currentLobby && (
              <span className="text-sm text-muted-foreground">
                {currentLobby.participants.length} voters
              </span>
            )}
          </div>
        </div>
        
        {error && (
          <div className="text-sm text-red-500 mt-4">{error}</div>
        )}
      </div>
    </div>
  );
}
