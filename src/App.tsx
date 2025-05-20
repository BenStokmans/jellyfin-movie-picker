import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { socketService } from '@/services/socket';
import { useAppStore } from '@/services/store';

// Pages
import Login from '@/pages/Login';
import Lobby from '@/pages/Lobby';
import MoviePicker from '@/pages/MoviePicker';
import Result from '@/pages/Result';
import NotFound from '@/pages/NotFound';

export default function App() {
  const { isAuthenticated, currentLobby } = useAppStore();
  const navigate = useNavigate();

  // Initialize socket connection
  useEffect(() => {
    // Connect to the same server hosting the app (no URL needed)
    socketService.connect();

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Redirect based on lobby status
  useEffect(() => {
    if (currentLobby?.status === 'picking') {
      navigate('/picker');
    } else if (currentLobby?.status === 'completed') {
      navigate('/result');
    }
  }, [currentLobby, navigate]);

  return (
      <div className="flex items-center justify-center min-h-screen">
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/lobby" /> : <Login />} />
          {/* Remove auth guard from lobby routes so guests can join via invite link */}
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/lobby/:inviteCode" element={<Lobby />} />
          <Route 
            path="/picker" 
            element={isAuthenticated ? <MoviePicker /> : <Navigate to="/" />} 
          />
          <Route path="/result" element={<Result />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
  );
}
