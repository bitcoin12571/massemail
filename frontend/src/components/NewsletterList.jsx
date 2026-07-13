import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './NewsletterList.css'
import NewsletterEditor from './NewsletterEditor'

export default function NewsletterList({ onRefresh }) {
  const [newsletters, setNewsletters] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedNewsletter, setSelectedNewsletter] = useState(null)
  const [editingNewsletter, setEditingNewsletter] = useState(null)

  useEffect(() => {
    fetchNewsletters()
  }, [onRefresh])

  const fetchNewsletters = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/newsletters')
      setNewsletters(response.data)
    } catch (error) {
      console.error('Failed to fetch newsletters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this newsletter?')) {
      try {
        await axios.delete(`/api/newsletters/${id}`)
        setNewsletters(newsletters.filter(n => n._id !== id))
        setSelectedNewsletter(null)
      } catch (error) {
        console.error('Failed to delete newsletter:', error)
      }
    }
  }

  const handleSend = async (id) => {
    if (confirm('Send this newsletter immediately to all subscribers?')) {
      try {
        const response = await axios.post(`/api/newsletters/${id}/send`)
        alert(`Newsletter sent to ${response.data.result.sent} subscribers!`)
        fetchNewsletters()
      } catch (error) {
        alert('Failed to send newsletter: ' + error.response?.data?.error)
      }
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'sent': return '#3c3'
      case 'scheduled': return '#f9a'
      case 'draft': return '#99f'
      case 'failed': return '#f44'
      default: return '#999'
    }
  }

  if (editingNewsletter) {
    return (
      <NewsletterEditor
        newsletter={editingNewsletter}
        onClose={() => {
          setEditingNewsletter(null)
          fetchNewsletters()
        }}
      />
    )
  }

  if (loading) {
    return <div className="loading">Loading newsletters...</div>
  }

  if (newsletters.length === 0) {
    return (
      <div className="empty-state">
        <h2>📬 No newsletters yet</h2>
        <p>Create your first newsletter to get started!</p>
      </div>
    )
  }

  return (
    <div className="newsletter-list">
      <h2>📰 Your Newsletters</h2>

      <div className="list-grid">
        {newsletters.map(newsletter => (
          <div key={newsletter._id} className="newsletter-card">
            <div className="card-header">
              <h3>{newsletter.subject}</h3>
              <span
                className="status-badge"
                style={{ background: getStatusColor(newsletter.status) }}
              >
                {newsletter.status}
              </span>
            </div>

            <div className="card-body">
              <p className="article-count">📄 {newsletter.articles.length} articles</p>
              <p className="created-date">
                📅 {new Date(newsletter.createdAt).toLocaleDateString()}
              </p>

              {newsletter.sentAt && (
                <p className="sent-date">
                  ✅ Sent: {new Date(newsletter.sentAt).toLocaleDateString()}
                </p>
              )}

              {newsletter.scheduledFor && (
                <p className="scheduled-date">
                  ⏰ Scheduled for: {new Date(newsletter.scheduledFor).toLocaleDateString()}
                </p>
              )}

              {newsletter.recipientCount > 0 && (
                <p className="recipient-count">
                  👥 Sent to {newsletter.recipientCount} subscribers
                </p>
              )}
            </div>

            <div className="card-actions">
              <button
                className="btn-edit"
                onClick={() => setEditingNewsletter(newsletter)}
              >
                ✏️ Edit
              </button>

              {newsletter.status === 'draft' && (
                <button
                  className="btn-send"
                  onClick={() => handleSend(newsletter._id)}
                >
                  📧 Send Now
                </button>
              )}

              <button
                className="btn-delete"
                onClick={() => handleDelete(newsletter._id)}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
