// 404 Not Found page
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Page Not Found</CardTitle>
        </CardHeader>
        
        <CardContent className="text-center">
          <p className="mb-4">The page you're looking for doesn't exist or has been moved.</p>
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
