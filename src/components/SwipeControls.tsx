// Swipe Controls component for the Tinder-style interface
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SwipeControlsProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  disabled?: boolean;
}

export function SwipeControls({ onSwipeLeft, onSwipeRight, disabled = false }: SwipeControlsProps) {
   const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Minimum required distance between touch start and touch end to be detected as swipe
  const minSwipeDistance = 50;
  
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null); // Reset touchEnd
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || disabled) return;
    
    const distance = touchStart - touchEnd;
    const isSwipe = Math.abs(distance) > minSwipeDistance;
    
    if (isSwipe) {
      if (distance > 0) {
        // Swiped left
        onSwipeLeft();
      } else {
        // Swiped right
        onSwipeRight();
      }
    }
  };
  
  useEffect(() => {
    // Add this event listener to the document to enable swiping anywhere on the page
    // but only when this component is mounted
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      
      if (e.key === 'ArrowLeft') {
        onSwipeLeft();
      } else if (e.key === 'ArrowRight') {
        onSwipeRight();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSwipeLeft, onSwipeRight, disabled]);
  
  return (
    <div
      className="flex justify-center gap-8"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <Button
        variant="outline"
        size="icon"
        className="h-16 w-16 rounded-full border-2 border-red-500 text-red-500 hover:bg-red-500/10 hover:scale-110 transition-transform hover:shadow-lg"
        onClick={onSwipeLeft}
        disabled={disabled}
      >
        <X className="h-8 w-8" />
        <span className="sr-only">Dislike</span>
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        className="h-16 w-16 rounded-full border-2 border-green-500 text-green-500 hover:bg-green-500/10 hover:scale-110 transition-transform hover:shadow-lg"
        onClick={onSwipeRight}
        disabled={disabled}
      >
        <Check className="h-8 w-8" />
        <span className="sr-only">Like</span>
      </Button>
    </div>
  );
}
