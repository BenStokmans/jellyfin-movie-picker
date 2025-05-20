// Login page for the application
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jellyfinService } from '@/services/jellyfin';
import { useAppStore } from '@/services/store';
import { socketService } from '@/services/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
  const navigate = useNavigate();
  const { setUser, serverUrl, setServerUrl } = useAppStore();
  
  const [serverAddress, setServerAddress] = useState(serverUrl || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Connect to Jellyfin server
      await jellyfinService.connect(serverAddress);
      
      // Authenticate user
      const { userId, accessToken } = await jellyfinService.authenticate(username, password);
      
      // Generate a random ID for our app's user
      const appUserId = Math.random().toString(36).substr(2, 9);
      
      // Set user in store
      const user = {
        id: appUserId,
        name: username,
        jellyfinUserId: userId,
        jellyfinAccessToken: accessToken
      };
      
      setUser(user);
      
      // Set server URL in store
      setServerUrl(serverAddress);
      
      // Set user ID in socket service
      socketService.setUserId(appUserId);
      
      // Navigate to lobby page
      navigate('/lobby');
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to login. Please check your credentials and server address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Jellyfin Movie Picker</CardTitle>
          <CardDescription className="text-center">Log in with your Jellyfin account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="server">Server Address</Label>
              <Input
                id="server"
                placeholder="http://your-jellyfin-server:8096"
                value={serverAddress}
                onChange={(e) => setServerAddress(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-500 mt-2">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-xs text-center justify-center">
          Pick movies together with friends from your Jellyfin library
        </CardFooter>
      </Card>
    </div>
  );
}
