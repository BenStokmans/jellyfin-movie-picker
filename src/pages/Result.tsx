// Result page to display the matched movie
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/services/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MovieDetails } from '@/components/MovieDetails';
import { Movie } from '@/types';

export default function Result() {
  const navigate = useNavigate();
  const { currentLobby, movies, resetState } = useAppStore();
  
  const [matchedMovie, setMatchedMovie] = useState<Movie | null>(null);

  // Find the matched movie
  useEffect(() => {
    if (currentLobby?.selectedMovieId && movies.length > 0) {
      const movie = movies.find(m => m.id === currentLobby.selectedMovieId) || null;
      setMatchedMovie(movie);
    } else {
      navigate('/lobby');
    }
  }, [currentLobby, movies, navigate]);

  const handleNewSession = () => {
    resetState();
    navigate('/lobby');
  };

  if (!matchedMovie) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center">It's a Match!</CardTitle>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center">
          <div className="w-full max-w-sm mb-6">
            <MovieDetails movie={matchedMovie} showFullDetails />
          </div>
          
          <div className="w-full text-center p-4 bg-muted rounded-lg mb-6">
            <p className="mb-2 font-medium">Everyone agreed on this movie!</p>
            <p className="text-sm text-muted-foreground">
              Time to pop some popcorn and enjoy your movie night.
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-center gap-4">
          <Button onClick={handleNewSession}>Start New Session</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
