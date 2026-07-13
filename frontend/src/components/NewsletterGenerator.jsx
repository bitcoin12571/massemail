import React, { useState } from 'react'
import axios from 'axios'
import './NewsletterGenerator.css'

export default function NewsletterGenerator({ onSuccess }) {
  const [formData, setFormData] = useState({
    topic: '',
    numArticles: 3,
    tone: 'professional',
    subject: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'numArticles' ? parseInt(value) : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await axios.post('/api/newsletters/generate', formData)
      setSuccess('Newsletter generated successfully! ✅')
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate newsletter')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="generator-container">
      <div className="generator-card">
        <h2>✨ Create New Newsletter</h2>
        <p className="subtitle">AI will generate content and images automatically</p>

        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="topic">Newsletter Topic *</label>
            <input
              id="topic"
              type="text"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              placeholder="e.g., AI Trends, Tech News, Marketing Tips..."
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="numArticles">Number of Articles</label>
              <select
                id="numArticles"
                name="numArticles"
                value={formData.numArticles}
                onChange={handleChange}
              >
                <option value="1">1 Article</option>
                <option value="2">2 Articles</option>
                <option value="3">3 Articles</option>
                <option value="5">5 Articles</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tone">Tone</label>
              <select
                id="tone"
                name="tone"
                value={formData.tone}
                onChange={handleChange}
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="creative">Creative</option>
                <option value="informative">Informative</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="subject">Email Subject (Optional)</label>
            <input
              id="subject"
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="e.g., Weekly Newsletter - July 13, 2024"
            />
          </div>

          <div className="generator-info">
            <p>⏳ <strong>Estimated time:</strong> 30-45 seconds (depends on AI response time)</p>
            <p>🤖 Uses OpenAI ChatGPT for text and DALL-E for images</p>
          </div>

          <button type="submit" className="btn-generate" disabled={loading}>
            {loading ? '⏳ Generating...' : '✨ Generate Newsletter'}
          </button>
        </form>
      </div>
    </div>
  )
}
