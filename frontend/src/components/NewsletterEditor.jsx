import React, { useState } from 'react'
import axios from 'axios'
import './NewsletterEditor.css'

export default function NewsletterEditor({ newsletter, onClose }) {
  const [editedNewsletter, setEditedNewsletter] = useState(newsletter)
  const [savingStatus, setSavingStatus] = useState('')
  const [regeneratingArticles, setRegeneratingArticles] = useState(new Set())

  const handleSubjectChange = (e) => {
    setEditedNewsletter({
      ...editedNewsletter,
      subject: e.target.value
    })
  }

  const handleArticleChange = (index, field, value) => {
    const articles = [...editedNewsletter.articles]
    articles[index][field] = value
    setEditedNewsletter({
      ...editedNewsletter,
      articles
    })
  }

  const handleSave = async () => {
    try {
      setSavingStatus('Saving...')
      await axios.put(`/api/newsletters/${editedNewsletter._id}`, {
        subject: editedNewsletter.subject,
        articles: editedNewsletter.articles
      })
      setSavingStatus('Saved ✅')
      setTimeout(() => setSavingStatus(''), 2000)
    } catch (error) {
      setSavingStatus('Error saving: ' + error.message)
    }
  }

  const handleRegenerateText = async (articleIndex) => {
    try {
      setRegeneratingArticles(new Set([...regeneratingArticles, articleIndex]))
      const response = await axios.post(
        `/api/newsletters/${editedNewsletter._id}/regenerate-text/${articleIndex}`,
        { topic: editedNewsletter.subject }
      )
      handleArticleChange(articleIndex, 'title', response.data.article.title)
      handleArticleChange(articleIndex, 'content', response.data.article.content)
    } catch (error) {
      alert('Failed to regenerate: ' + error.message)
    } finally {
      setRegeneratingArticles(prev => {
        const next = new Set(prev)
        next.delete(articleIndex)
        return next
      })
    }
  }

  const handleRegenerateImage = async (articleIndex) => {
    try {
      setRegeneratingArticles(new Set([...regeneratingArticles, articleIndex]))
      const response = await axios.post(
        `/api/newsletters/${editedNewsletter._id}/regenerate-image/${articleIndex}`,
        {}
      )
      handleArticleChange(articleIndex, 'imageUrl', response.data.imageUrl)
    } catch (error) {
      alert('Failed to regenerate image: ' + error.message)
    } finally {
      setRegeneratingArticles(prev => {
        const next = new Set(prev)
        next.delete(articleIndex)
        return next
      })
    }
  }

  const handleSendNow = async () => {
    if (confirm('Send this newsletter immediately to all subscribers?')) {
      try {
        setSavingStatus('Sending...')
        const response = await axios.post(`/api/newsletters/${editedNewsletter._id}/send`)
        setSavingStatus(`Sent to ${response.data.result.sent} subscribers ✅`)
        setTimeout(() => onClose(), 2000)
      } catch (error) {
        setSavingStatus('Error sending: ' + error.message)
      }
    }
  }

  const handleSchedule = async () => {
    const scheduledTime = prompt('Enter scheduled date and time (YYYY-MM-DD HH:MM):')
    if (scheduledTime) {
      try {
        setSavingStatus('Scheduling...')
        await axios.post(`/api/newsletters/${editedNewsletter._id}/schedule`, {
          scheduledFor: new Date(scheduledTime).toISOString()
        })
        setSavingStatus('Scheduled ✅')
        setTimeout(() => onClose(), 2000)
      } catch (error) {
        setSavingStatus('Error scheduling: ' + error.message)
      }
    }
  }

  return (
    <div className="editor-overlay">
      <div className="editor-container">
        <div className="editor-header">
          <h2>✏️ Edit Newsletter</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="editor-content">
          <div className="form-group">
            <label>Subject</label>
            <input
              type="text"
              value={editedNewsletter.subject}
              onChange={handleSubjectChange}
              placeholder="Newsletter subject..."
            />
          </div>

          <div className="articles-section">
            <h3>📄 Articles</h3>
            {editedNewsletter.articles.map((article, index) => (
              <div key={index} className="article-editor">
                <div className="article-header">
                  <span>Article {index + 1}</span>
                  {regeneratingArticles.has(index) && <span className="regenerating">⏳</span>}
                </div>

                <div className="article-body">
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      value={article.title}
                      onChange={(e) => handleArticleChange(index, 'title', e.target.value)}
                      placeholder="Article title..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Content</label>
                    <textarea
                      value={article.content}
                      onChange={(e) => handleArticleChange(index, 'content', e.target.value)}
                      placeholder="Article content..."
                      rows="4"
                    />
                  </div>

                  {article.imageUrl && (
                    <div className="image-preview">
                      <img src={article.imageUrl} alt={article.title} />
                    </div>
                  )}

                  <div className="article-actions">
                    <button
                      className="btn-regenerate"
                      onClick={() => handleRegenerateText(index)}
                      disabled={regeneratingArticles.has(index)}
                    >
                      🔄 Regenerate Text
                    </button>
                    <button
                      className="btn-regenerate"
                      onClick={() => handleRegenerateImage(index)}
                      disabled={regeneratingArticles.has(index)}
                    >
                      🎨 Regenerate Image
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="editor-footer">
          {savingStatus && <span className="status-message">{savingStatus}</span>}
          <div className="action-buttons">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>💾 Save Draft</button>
            <button className="btn-success" onClick={handleSendNow}>📧 Send Now</button>
            <button className="btn-warning" onClick={handleSchedule}>⏰ Schedule</button>
          </div>
        </div>
      </div>
    </div>
  )
}
