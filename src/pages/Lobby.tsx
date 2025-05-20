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
  const { user, currentLobby, setCurrentLobby, setMovies, setUser, serverUrl } = useAppStore();
  
  const [lobbyName, setLobbyName] = useState('');
  const [joinCode, setJoinCode] = useState(inviteCode || '');
  const [loading, setLoading] = useState(false);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [guestName, setGuestName] = useState(user?.name || '');

  // Set invite code from URL parameter
  useEffect(() => {
    if (inviteCode) {
      setJoinCode(inviteCode);
      // Create anonymous guest if no user
      if (!user) {
        const guestId = Math.random().toString(36).substr(2, 9);
        setUser({ id: guestId, name: 'Guest', jellyfinUserId: '', jellyfinAccessToken: '' });
      }
      // DO NOT auto-join, let user enter their name first
    }
  }, [inviteCode, setUser, user]);
  
  // Don't auto-join, show name prompt instead

  // When user state changes (e.g. guest created), initialize guestName
  useEffect(() => {
    if (user && !user.jellyfinUserId) {
      setGuestName(user.name);
    }
  }, [user]);

  // lobby updates: navigate on picking/completed
  useEffect(() => {
    if (!currentLobby) return;
    const unsub = socketService.onLobbyChange((updated) => {
      setCurrentLobby(updated);
      if (updated.status === 'picking') navigate('/picker');
      if (updated.status === 'completed') navigate('/result');
    });
    return unsub;
  }, [currentLobby, navigate, setCurrentLobby]);

  const handleCreateLobby = async () => {
    if (!user) return;

    // if guest, update name
    if (!user.jellyfinUserId) {
      setUser({ ...user, name: guestName });
    }

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
    if (!joinCode) { 
      setError('Please enter an invite code'); 
      return; 
    }

    if (user && !user.jellyfinUserId) {
      setUser({ ...user, name: guestName });
    }

    setError(''); 
    setLoading(true);
    try {
      // ensure guest user
      const current = useAppStore.getState().user;
      if (!current) {
        const guestId = Math.random().toString(36).substr(2, 9);
        useAppStore.getState().setUser({ id: guestId, name: 'Guest', jellyfinUserId: '', jellyfinAccessToken: '' });
      }
      const lobby = await socketService.joinLobbyWithCode(useAppStore.getState().user!, joinCode);
      setCurrentLobby(lobby);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
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

  const copyInviteLink = async () => {
    if (!currentLobby) return;
    const url = `${window.location.origin}/lobby/${currentLobby.inviteCode}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(url);
      } catch (err) {
        console.error('Clipboard write error:', err);
      }
    } else {
      // Fallback for insecure contexts or older browsers
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Fallback copy error:', err);
      }
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleStartSession = async () => {
    if (!user || !currentLobby) return;
    
    setLoadingMovies(true);
    
    try {
      // Reconnect to Jellyfin using persisted server URL
      await jellyfinService.connect(serverUrl);
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-lg">
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
                  <div className="font-mono text-xl bg-background p-3 rounded flex-1 text-center tracking-wider select-all shadow-inner">
                    {currentLobby.inviteCode}
                  </div>
                  <Button
                    variant="outline"
                    onClick={copyInviteLink}
                    className="flex-shrink-0 hover:bg-primary/10"
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
                      className="flex items-center justify-between p-2 px-3 bg-muted rounded shadow-sm"
                    >
                      <span>{participant.name}</span>
                      {participant.id === currentLobby.creatorId && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded font-medium">Host</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {isCreator && (
                <Button 
                  onClick={handleStartSession} 
                  className="w-full mt-6 py-6 text-lg font-medium transition-all hover:scale-[1.02] hover:shadow-md"
                  disabled={currentLobby.participants.length < 1 || loadingMovies}
                >
                  {loadingMovies ? 'Loading Movies...' : 'Start Movie Picking'}
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={handleLeaveLobby} 
                className="w-full mt-3 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-950 dark:hover:text-red-400 transition-colors"
              >
                Leave Lobby
              </Button>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              {/* Guest name input for anonymous users */}
              {(!user || !user.jellyfinUserId) && (
                <div className="space-y-2">
                  <h3 className="font-medium text-center">Your Name</h3>
                  <Input
                    placeholder="Enter your name"
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    className="text-center"
                  />
                </div>
              )}

              {user && user.jellyfinUserId && (
                <>
                  <div className="space-y-2">
                    <h3 className="font-medium text-center">Create a New Lobby</h3>
                    <Input
                      placeholder="Lobby Name (optional)"
                      value={lobbyName}
                      onChange={(e) => setLobbyName(e.target.value)}
                      className="text-center"
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
                    <div className="absolute border-t border-border w-full" />
                    <span className="relative px-2 bg-card text-muted-foreground text-sm">or</span>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <h3 className="font-medium text-center">Join an Existing Lobby</h3>
                <Input
                  placeholder="Enter Invite Code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="text-center"
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
                <div className="text-sm text-red-500 mt-2 text-center">{error}</div>
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
