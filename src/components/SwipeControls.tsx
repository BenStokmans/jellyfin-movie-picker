// Swipe Controls component for the Tinder-style interface
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';

interface SwipeControlsProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  disabled?: boolean;
}

export function SwipeControls({ onSwipeLeft, onSwipeRight, disabled = false }: SwipeControlsProps) {
  return (
    <div className="flex justify-center gap-8">
      <Button
        variant="outline"
        size="icon"
        className="h-16 w-16 rounded-full border-2 border-red-500 text-red-500 hover:bg-red-500/10"
        onClick={onSwipeLeft}
        disabled={disabled}
      >
        <X className="h-8 w-8" />
        <span className="sr-only">Dislike</span>
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        className="h-16 w-16 rounded-full border-2 border-green-500 text-green-500 hover:bg-green-500/10"
        onClick={onSwipeRight}
        disabled={disabled}
      >
        <Check className="h-8 w-8" />
        <span className="sr-only">Like</span>
      </Button>
    </div>
  );
}
