// Movie Card component for displaying movie information
import { Card } from '@/components/ui/card';
import { Movie } from '@/types';

interface MovieCardProps {
  movie: Movie;
}

export function MovieCard({ movie }: MovieCardProps) {
  return (
    <Card className="overflow-hidden h-[500px] w-full max-w-[320px] sm:max-w-sm md:max-w-lg lg:max-w-xl mx-auto shadow-xl">
      <div className="relative h-full">
        {movie.posterUrl ? (
          <img 
            src={movie.posterUrl} 
            alt={movie.name}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground">No poster available</span>
          </div>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h3 className="text-xl font-bold text-white mb-1 text-shadow">
            {movie.name} {movie.year ? `(${movie.year})` : ''}
          </h3>
          
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2 justify-center">
              {movie.genres.slice(0, 3).map((genre) => (
                <span 
                  key={genre} 
                  className="inline-block px-2 py-0.5 bg-primary/70 text-white text-xs font-medium rounded shadow-sm"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
          
          <p className="text-white/90 text-sm line-clamp-3 text-shadow-sm">
            {movie.overview || 'No description available.'}
          </p>
        </div>
      </div>
    </Card>
  );
}
