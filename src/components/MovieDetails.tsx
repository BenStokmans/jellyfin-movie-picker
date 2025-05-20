// Movie Details component for the result page
import { Movie } from '@/types';

interface MovieDetailsProps {
  movie: Movie;
  showFullDetails?: boolean;
}

export function MovieDetails({ movie, showFullDetails = false }: MovieDetailsProps) {
  // Format runtime to hours and minutes
  const formatRuntime = (minutes: number) => {
    if (!minutes) return 'Unknown length';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${mins > 0 ? `${mins}m` : ''}`;
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-1/3 aspect-[2/3] bg-muted rounded-md overflow-hidden">
          {movie.posterUrl ? (
            <img 
              src={movie.posterUrl} 
              alt={movie.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-muted-foreground">No poster</span>
            </div>
          )}
        </div>
        
        <div className="w-full sm:w-2/3">
          <h2 className="text-2xl font-bold mb-1">
            {movie.name} {movie.year ? `(${movie.year})` : ''}
          </h2>
          
          <div className="mb-3 flex items-center text-sm text-muted-foreground">
            {movie.runtime > 0 && (
              <span className="mr-3">{formatRuntime(movie.runtime)}</span>
            )}
          </div>
          
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {movie.genres.map((genre) => (
                <span 
                  key={genre} 
                  className="inline-block px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
          
          {showFullDetails && (
            <p className="text-sm mt-3 line-clamp-6">
              {movie.overview || 'No description available.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
