// Lobby page for the application
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { socketService } from '@/services/socket';
import { jellyfinService } from '@/services/jellyfin';
import { useAppStore } from '@/services/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { User } from '@/types';

export default function Lobby() {
  const navigate = useNavigate();
  const { inviteCode } = useParams<{ inviteCode?: string }>();
  const { user, currentLobby, setCurrentLobby, setMovies } = useAppStore();
  
  const [lobbyName, setLobbyName] = useState('');
  const [joinCode, setJoinCode] = useState(inviteCode || '');
  const [loading, setLoading] = useState(false);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Join with invite code from URL parameter
  useEffect(() => {
    if (inviteCode && user) {
      handleJoinLobby();
    }
  }, [inviteCode, user]);

  // Set up lobby update listener
  useEffect(() => {
    if (!currentLobby) return;

    const unsubscribe = socketService.onLobbyChange((updatedLobby) => {
      setCurrentLobby(updatedLobby);
      
      // If lobby status changed to 'picking', navigate to picker page
      if (updatedLobby.status === 'picking') {
        navigate('/picker');
      }
      
      // If lobby status changed to 'completed', navigate to result page
      if (updatedLobby.status === 'completed') {
        navigate('/result');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentLobby, setCurrentLobby, navigate]);

  const handleCreateLobby = async () => {
    if (!user) return;
    
    setError('');
    setLoading(true);
    
    try {
      const lobby = await socketService.createLobby(user, lobbyName || `${user.name}'s Lobby`);
      setCurrentLobby(lobby);
    } catch (error) {
      console.error('Create lobby error:', error);
      setError('Failed to create lobby');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLobby = async () => {
    if (!user) return;
    if (!joinCode) {
      setError('Please enter an invite code');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const lobby = await socketService.joinLobbyWithCode(user, joinCode);
      setCurrentLobby(lobby);
    } catch (error) {
      console.error('Join lobby error:', error);
      setError('Failed to join lobby. Please check the invite code.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveLobby = async () => {
    if (!user || !currentLobby) return;
    
    try {
      await socketService.leaveLobby(user.id, currentLobby.id);
      setCurrentLobby(null);
    } catch (error) {
      console.error('Leave lobby error:', error);
    }
  };

  const copyInviteLink = () => {
    if (!currentLobby) return;
    
    const url = `${window.location.origin}/lobby/${currentLobby.inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleStartSession = async () => {
    if (!user || !currentLobby) return;
    
    setLoadingMovies(true);
    
    try {
      // Fetch movies from Jellyfin
      const movies = await jellyfinService.getMovies(
        user.jellyfinUserId, 
        user.jellyfinAccessToken
      );
      
      // Store movies in app state
      setMovies(movies);
      
      // Start movie session
      await socketService.startMovieSession(currentLobby.id, movies);
      
      // Navigation will happen automatically via the lobby update listener
    } catch (error) {
      console.error('Start session error:', error);
      setError('Failed to start movie session');
      setLoadingMovies(false);
    }
  };

  const isCreator = currentLobby && user ? currentLobby.creatorId === user.id : false;

  // Loading state while we handle the invite code from URL
  if (inviteCode && !currentLobby && !error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Joining Lobby...</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            Please wait while we connect you to the lobby.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {currentLobby ? currentLobby.name : 'Movie Picker Lobby'}
          </CardTitle>
          <CardDescription className="text-center">
            {currentLobby 
              ? 'Invite friends to join your movie picking session' 
              : 'Create or join a lobby to pick movies'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {currentLobby ? (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="font-medium mb-1">Invite Code:</div>
                <div className="flex items-center gap-2">
                  <div className="font-mono text-xl bg-background p-2 rounded flex-1 text-center">
                    {currentLobby.inviteCode}
                  </div>
                  <Button
                    variant="outline"
                    onClick={copyInviteLink}
                    className="flex-shrink-0"
                  >
                    {copied ? 'Copied!' : 'Copy Link'}
                  </Button>
                </div>
              </div>
              
              <div className="mt-4">
                <h3 className="font-medium mb-2">Participants ({currentLobby.participants.length})</h3>
                <div className="space-y-2">
                  {currentLobby.participants.map((participant: User) => (
                    <div 
                      key={participant.id} 
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <span>{participant.name}</span>
                      {participant.id === currentLobby.creatorId && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Host</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {isCreator && (
                <Button 
                  onClick={handleStartSession} 
                  className="w-full mt-4"
                  disabled={currentLobby.participants.length < 1 || loadingMovies}
                >
                  {loadingMovies ? 'Loading Movies...' : 'Start Movie Picking'}
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={handleLeaveLobby} 
                className="w-full mt-2"
              >
                Leave Lobby
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Create a New Lobby</h3>
                <Input
                  placeholder="Lobby Name (optional)"
                  value={lobbyName}
                  onChange={(e) => setLobbyName(e.target.value)}
                />
                <Button 
                  onClick={handleCreateLobby} 
                  className="w-full"
                  disabled={loading}
                >
                  Create Lobby
                </Button>
              </div>
              
              <div className="relative flex items-center justify-center my-4">
                <div className="absolute border-t border-border w-full"></div>
                <span className="relative px-2 bg-card text-muted-foreground text-sm">or</span>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Join an Existing Lobby</h3>
                <Input
                  placeholder="Enter Invite Code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
                <Button 
                  variant="outline" 
                  onClick={handleJoinLobby} 
                  className="w-full"
                  disabled={loading}
                >
                  Join Lobby
                </Button>
              </div>
              
              {error && (
                <div className="text-sm text-red-500 mt-2">{error}</div>
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="text-xs text-center justify-center text-muted-foreground">
          {currentLobby
            ? 'Waiting for the host to start the movie selection'
            : 'Create a lobby and invite friends to pick a movie together'}
        </CardFooter>
      </Card>
    </div>
  );
}
