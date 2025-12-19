'use client';

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Login from '@/components/whatsapp/Login';
import Register from '@/components/whatsapp/Register';
import ChatInterface from '@/components/whatsapp/ChatInterface';
import { useAuthStore } from '@/stores/authStore';

export default function Home() {
  const [currentView, setCurrentView] = useState<'login' | 'register'>('login');
  const { user, token, initializeAuth } = useAuthStore();

  useEffect(() => {
    // Check for existing auth on mount
    initializeAuth();
  }, [initializeAuth]);

  if (!user || !token) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {currentView === 'login' ? (
            <Login onSwitchToRegister={() => setCurrentView('register')} />
          ) : (
            <Register onSwitchToLogin={() => setCurrentView('login')} />
          )}
        </div>
      </div>
    );
  }

  return <ChatInterface />;
}