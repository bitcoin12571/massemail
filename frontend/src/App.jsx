import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'

// Configure API URL for deployment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
axios.defaults.baseURL = API_URL

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
    }
    setLoading(false)
  }, [])

  const handleLogout = () => {
    setToken(null)
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
  }

  const handleLogin = (newToken) => {
    setToken(newToken)
    localStorage.setItem('token', newToken)
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return token ? (
    <Dashboard onLogout={handleLogout} />
  ) : (
    <AuthPage onLogin={handleLogin} />
  )
}

export default App
