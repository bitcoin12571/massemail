import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './Dashboard.css'
import NewsletterGenerator from '../components/NewsletterGenerator'
import NewsletterList from '../components/NewsletterList'
import NewsletterEditor from '../components/NewsletterEditor'
import ScheduleSettings from '../components/ScheduleSettings'
import SubscriberManager from '../components/SubscriberManager'

export default function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('newsletters')
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [refresh, setRefresh] = useState(false)

  useEffect(() => {
    fetchUserData()
    fetchStats()
  }, [refresh])

  const fetchUserData = async () => {
    try {
      const response = await axios.get('/api/auth/me')
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/admin/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleRefresh = () => {
    setRefresh(!refresh)
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>📬 Newsletter Dashboard</h1>
          <div className="header-actions">
            <span className="user-email">{user?.email}</span>
            <button className="btn-logout" onClick={onLogout}>Logout</button>
          </div>
        </div>
      </header>

      {stats && (
        <div className="stats-bar">
          <div className="stat-card">
            <span className="stat-value">{stats.totalNewsletters}</span>
            <span className="stat-label">Total Newsletters</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.sentNewsletters}</span>
            <span className="stat-label">Sent</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.totalSubscribers}</span>
            <span className="stat-label">Subscribers</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.totalEmailsSent}</span>
            <span className="stat-label">Emails Sent</span>
          </div>
        </div>
      )}

      <nav className="dashboard-nav">
        <button
          className={`nav-item ${activeTab === 'newsletters' ? 'active' : ''}`}
          onClick={() => setActiveTab('newsletters')}
        >
          📰 Newsletters
        </button>
        <button
          className={`nav-item ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          ✨ Create New
        </button>
        <button
          className={`nav-item ${activeTab === 'subscribers' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscribers')}
        >
          👥 Subscribers
        </button>
        <button
          className={`nav-item ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          ⏰ Schedule
        </button>
      </nav>

      <main className="dashboard-content">
        {activeTab === 'newsletters' && (
          <NewsletterList onRefresh={handleRefresh} />
        )}
        {activeTab === 'create' && (
          <NewsletterGenerator onSuccess={() => {
            setActiveTab('newsletters')
            handleRefresh()
          }} />
        )}
        {activeTab === 'subscribers' && (
          <SubscriberManager />
        )}
        {activeTab === 'schedule' && (
          <ScheduleSettings user={user} onUpdate={() => {
            fetchUserData()
            handleRefresh()
          }} />
        )}
      </main>
    </div>
  )
}
