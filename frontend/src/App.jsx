import React, { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';

function readStoredUser() {
  if (!localStorage.getItem('authToken')) return null;

  try {
    return JSON.parse(localStorage.getItem('mailoraUser'));
  } catch {
    localStorage.removeItem('authToken');
    localStorage.removeItem('mailoraUser');
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(readStoredUser);

  useEffect(() => {
    const logout = () => setUser(null);
    window.addEventListener('mailora:logout', logout);
    return () => window.removeEventListener('mailora:logout', logout);
  }, []);

  const handleLogin = (token, nextUser) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('mailoraUser', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('mailoraUser');
    setUser(null);
  };

  return user
    ? <Dashboard user={user} onLogout={handleLogout} />
    : <Login onLogin={handleLogin} />;
}
