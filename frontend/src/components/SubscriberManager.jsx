import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './SubscriberManager.css'

export default function SubscriberManager() {
  const [subscribers, setSubscribers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newSubscriber, setNewSubscriber] = useState({
    email: '',
    firstName: '',
    lastName: ''
  })
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchSubscribers()
  }, [])

  const fetchSubscribers = async () => {
    try {
      const response = await axios.get('/api/subscriptions')
      setSubscribers(response.data.subscribers)
    } catch (error) {
      console.error('Failed to fetch subscribers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSubscriber = async (e) => {
    e.preventDefault()
    try {
      setMessage('')
      const response = await axios.post('/api/subscriptions', newSubscriber)
      setSubscribers([response.data.subscriber, ...subscribers])
      setNewSubscriber({ email: '', firstName: '', lastName: '' })
      setMessage('✅ Subscriber added successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('❌ ' + (error.response?.data?.error || 'Failed to add subscriber'))
    }
  }

  const handleUnsubscribe = async (id) => {
    if (confirm('Are you sure you want to unsubscribe this email?')) {
      try {
        await axios.post(`/api/subscriptions/${id}/unsubscribe`)
        setSubscribers(subscribers.filter(s => s._id !== id))
        setMessage('✅ Subscriber removed!')
        setTimeout(() => setMessage(''), 3000)
      } catch (error) {
        setMessage('❌ Failed to unsubscribe')
      }
    }
  }

  if (loading) {
    return <div className="loading">Loading subscribers...</div>
  }

  return (
    <div className="subscriber-manager">
      <div className="add-subscriber-card">
        <h2>➕ Add New Subscriber</h2>

        {message && (
          <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleAddSubscriber}>
          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              id="email"
              type="email"
              value={newSubscriber.email}
              onChange={(e) => setNewSubscriber({ ...newSubscriber, email: e.target.value })}
              placeholder="subscriber@example.com"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                value={newSubscriber.firstName}
                onChange={(e) => setNewSubscriber({ ...newSubscriber, firstName: e.target.value })}
                placeholder="John"
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={newSubscriber.lastName}
                onChange={(e) => setNewSubscriber({ ...newSubscriber, lastName: e.target.value })}
                placeholder="Doe"
              />
            </div>
          </div>

          <button type="submit" className="btn-add">➕ Add Subscriber</button>
        </form>
      </div>

      <div className="subscribers-card">
        <h2>👥 Subscriber List ({subscribers.length})</h2>

        {subscribers.length === 0 ? (
          <div className="empty-message">No subscribers yet. Add one to get started!</div>
        ) : (
          <div className="subscribers-table">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Subscribed</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map(subscriber => (
                  <tr key={subscriber._id}>
                    <td>{subscriber.email}</td>
                    <td>
                      {subscriber.firstName || subscriber.lastName
                        ? `${subscriber.firstName || ''} ${subscriber.lastName || ''}`.trim()
                        : '-'
                      }
                    </td>
                    <td>
                      <span className="badge-active">Active</span>
                    </td>
                    <td>
                      <button
                        className="btn-unsubscribe"
                        onClick={() => handleUnsubscribe(subscriber._id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
