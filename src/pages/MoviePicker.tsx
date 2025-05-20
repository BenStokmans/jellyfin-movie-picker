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
  const { user, currentLobby, movies, movieSession, setMovieSession, currentMovieIndex, setCurrentMovieIndex } = useAppStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userVote, setUserVote] = useState<'yes' | 'no' | null>(null);

  // Redirect if no lobby or movies
  useEffect(() => {
    if (!currentLobby || movies.length === 0) {
      navigate('/lobby');
    }
  }, [currentLobby, movies, navigate]);

  // Set up session update listener
  useEffect(() => {
    if (!currentLobby) return;

    const unsubscribe = socketService.onSessionChange((updatedSession: MovieSession) => {
      setMovieSession(updatedSession);
      
      // If we have a match, navigate to result page
      if (updatedSession.matchedMovieId) {
        navigate('/result');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentLobby, setMovieSession, navigate]);

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
        <Card className="w-full max-w-md">
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
      <div className="w-full max-w-md flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-6">Pick a Movie</h1>
        
        <div 
          className={`w-full transition-transform duration-500 transform ${
            userVote === 'yes' ? 'translate-x-[120%]' : 
            userVote === 'no' ? 'translate-x-[-120%]' : 'translate-x-0'
          }`}
        >
          <Carousel className="w-full">
            <CarouselContent>
              <CarouselItem>
                <MovieCard movie={currentMovie} />
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
