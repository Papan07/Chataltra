import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CallProvider } from './context/CallContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ChatPage from './pages/ChatPage';
import VoiceMessageDebug from './components/VoiceMessageDebug';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <CallProvider>
          <Router>
            <div className="App">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Debug route */}
                <Route path="/debug/voice" element={<VoiceMessageDebug />} />

                {/* Protected routes */}
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <ChatPage />
                    </ProtectedRoute>
                  }
                />

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/chat" replace />} />

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/chat" replace />} />
              </Routes>
            </div>
          </Router>
        </CallProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
