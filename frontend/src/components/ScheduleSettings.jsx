import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './ScheduleSettings.css'

export default function ScheduleSettings({ user, onUpdate }) {
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [timezone, setTimezone] = useState('UTC')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) {
      setScheduleTime(user.scheduleTime || '09:00')
      setTimezone(user.timezone || 'UTC')
    }
  }, [user])

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage('')
      await axios.put('/api/auth/schedule', { scheduleTime, timezone })
      setMessage('Schedule updated successfully! ✅')
      onUpdate()
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('Error: ' + error.response?.data?.error)
    } finally {
      setSaving(false)
    }
  }

  const timezones = ['UTC', 'GMT', 'EST', 'CST', 'MST', 'PST', 'CET', 'AEST']

  return (
    <div className="schedule-settings">
      <div className="settings-card">
        <h2>⏰ Automatic Newsletter Schedule</h2>
        <p className="subtitle">Set when your newsletter should be sent automatically each day</p>

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <div className="settings-group">
          <div className="form-group">
            <label htmlFor="scheduleTime">Daily Send Time</label>
            <input
              id="scheduleTime"
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
            />
            <small>Newsletter will be sent automatically at this time every day</small>
          </div>

          <div className="form-group">
            <label htmlFor="timezone">Timezone</label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            <small>Your local timezone for accurate scheduling</small>
          </div>
        </div>

        <div className="info-box">
          <h4>📋 How it works:</h4>
          <ul>
            <li>Every day at {scheduleTime}, the system checks for scheduled newsletters</li>
            <li>If a newsletter is scheduled, it will be sent to all subscribers</li>
            <li>You can manually edit and regenerate content before sending</li>
            <li>All timestamps are in {timezone} timezone</li>
          </ul>
        </div>

        <button
          className="btn-save"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '⏳ Saving...' : '💾 Save Settings'}
        </button>
      </div>

      <div className="settings-card">
        <h2>🗓️ Manual Newsletter Creation</h2>
        <p>Instead of automatic scheduling, you can also:</p>
        <ul className="manual-options">
          <li>
            <strong>Create & Send Now:</strong> Generate a newsletter and send it immediately
          </li>
          <li>
            <strong>Schedule for Later:</strong> Create a newsletter and set a specific date/time
          </li>
          <li>
            <strong>Draft & Save:</strong> Save as draft and send whenever you're ready
          </li>
        </ul>
      </div>
    </div>
  )
}
