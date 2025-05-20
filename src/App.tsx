import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { socketService } from '@/services/socket';
import { useAppStore } from '@/services/store';

// Pages
import Login from '@/pages/Login';
import Lobby from '@/pages/Lobby';
import MoviePicker from '@/pages/MoviePicker';
import Result from '@/pages/Result';
import NotFound from '@/pages/NotFound';

export default function App() {
  const { isAuthenticated } = useAppStore();

  // Initialize socket connection
  useEffect(() => {
    // Connect to the same server hosting the app (no URL needed)
    socketService.connect();

    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/lobby" /> : <Login />} />
        <Route 
          path="/lobby" 
          element={isAuthenticated ? <Lobby /> : <Navigate to="/" />} 
        />
        <Route 
          path="/lobby/:inviteCode" 
          element={isAuthenticated ? <Lobby /> : <Navigate to="/" />} 
        />
        <Route 
          path="/picker" 
          element={isAuthenticated ? <MoviePicker /> : <Navigate to="/" />} 
        />
        <Route 
          path="/result" 
          element={isAuthenticated ? <Result /> : <Navigate to="/" />} 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
