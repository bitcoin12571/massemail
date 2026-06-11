import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Button,
  Paper,
  Snackbar,
  Alert,
  TextField,
  Typography,
  FormControlLabel,
  Switch,
  Stack
} from '@mui/material';
import { Gauge, Send } from 'lucide-react';
import API, { getApiErrorMessage } from '../services/api';
import { useLanguage } from '../i18n.jsx';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

const initialSettings = {
  provider: 'preview',
  senderName: 'Company Mail Center',
  senderEmail: '',
  smtpUser: '',
  smtpPassword: ''
};

export default function SystemSettings() {
  const { t } = useLanguage();
  const { preferences, updatePreference, REFRESH_INTERVALS, resetPreferences } = useUserPreferences();
  const [settings, setSettings] = useState(initialSettings);
  const [testEmail, setTestEmail] = useState({ to: '', subject: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    API.get('/settings/email')
      .then(({ data }) => setSettings({
        ...data,
        provider: ['preview', 'gmail', 'outlook'].includes(data.provider) ? data.provider : 'preview'
      }))
      .catch(() => setNotice({ type: 'error', text: t('settingsLoadError') }));
  }, []);

  const change = (field) => (event) => setSettings((current) => ({ ...current, [field]: event.target.value }));
  const changeTest = (field) => (event) => setTestEmail((current) => ({ ...current, [field]: event.target.value }));

  const payload = () => ({
    ...settings,
    senderEmail: settings.smtpUser || settings.senderEmail,
    smtpUser: settings.smtpUser || settings.senderEmail
  });

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await API.put('/settings/email', payload());
      setSettings(data);
      setNotice({ type: 'success', text: t('settingsSaved') });
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, t('settingsSaveError')) });
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    try {
      await API.put('/settings/email', payload());
      await API.post('/settings/email/send-test', testEmail);
      setNotice({
        type: 'success',
        text: settings.provider === 'preview' ? t('previewTestDone') : t('testEmailSent')
      });
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, t('testEmailFailed')) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Box className="page-heading">
        <Box>
          <Typography className="eyebrow">CONFIGURATION</Typography>
          <Typography variant="h3">{t('settingsTitle')}</Typography>
          <Typography color="text.secondary">{t('simpleSettingsHelp')}</Typography>
        </Box>
      </Box>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Paper className="settings-panel" sx={{ mb: 3, background: 'linear-gradient(135deg, #f0f9ff 0%, #f3f4f6 100%)' }}>
          <Box className="settings-section-title">
            <Box className="settings-icon" sx={{ background: '#dbeafe', color: '#1e40af' }}>
              <Gauge size={20} />
            </Box>
            <Box>
              <Typography variant="h6">User Preferences</Typography>
              <Typography variant="body2" color="text.secondary">Customize your experience and interface settings</Typography>
            </Box>
          </Box>

          <Box className="settings-fields">
            {/* Auto Refresh Queue */}
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Switch
                      checked={preferences.autoRefreshQueue}
                      onChange={(e) => updatePreference('autoRefreshQueue', e.target.checked)}
                    />
                  </motion.div>
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Auto-refresh queue</Typography>
                    <Typography variant="caption" color="text.secondary">Automatically refresh delivery status</Typography>
                  </Box>
                }
              />

              {/* Refresh Interval */}
              {preferences.autoRefreshQueue && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <TextField
                    select
                    fullWidth
                    label="Refresh interval"
                    value={preferences.refreshInterval}
                    onChange={(e) => updatePreference('refreshInterval', e.target.value === 'null' ? null : parseInt(e.target.value))}
                    size="small"
                  >
                    {REFRESH_INTERVALS.map((interval) => (
                      <MenuItem key={interval.label} value={interval.value}>
                        {interval.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </motion.div>
              )}

              {/* Animations */}
              <FormControlLabel
                control={
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Switch
                      checked={preferences.animationsEnabled}
                      onChange={(e) => updatePreference('animationsEnabled', e.target.checked)}
                    />
                  </motion.div>
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Animations</Typography>
                    <Typography variant="caption" color="text.secondary">Enable smooth transitions and effects</Typography>
                  </Box>
                }
              />

              {/* Notifications */}
              <FormControlLabel
                control={
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Switch
                      checked={preferences.notificationsEnabled}
                      onChange={(e) => updatePreference('notificationsEnabled', e.target.checked)}
                    />
                  </motion.div>
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Notifications</Typography>
                    <Typography variant="caption" color="text.secondary">Show alerts for important events</Typography>
                  </Box>
                }
              />

              {/* Compact Mode */}
              <FormControlLabel
                control={
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Switch
                      checked={preferences.compactMode}
                      onChange={(e) => updatePreference('compactMode', e.target.checked)}
                    />
                  </motion.div>
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Compact mode</Typography>
                    <Typography variant="caption" color="text.secondary">Reduce spacing and padding</Typography>
                  </Box>
                }
              />
            </Stack>
          </Box>

          <Box className="settings-actions">
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                resetPreferences();
                setNotice({ type: 'success', text: 'Preferences reset to defaults' });
              }}
            >
              Reset to defaults
            </Button>
          </Box>
        </Paper>
      </motion.div>

      <Box className="simple-settings-grid">
        <Paper className="settings-panel">
          <Box className="settings-section-title">
            <Box className="settings-icon"><Send size={20} /></Box>
            <Box>
              <Typography variant="h6">{t('testEmailTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('testEmailHelp')}</Typography>
            </Box>
          </Box>
          <Box className="settings-fields">
            <TextField label={t('testRecipient')} type="email" value={testEmail.to} onChange={changeTest('to')} />
            <TextField label={t('subject')} value={testEmail.subject} onChange={changeTest('subject')} />
            <TextField label={t('message')} multiline minRows={5} value={testEmail.message} onChange={changeTest('message')} />
          </Box>
          <Box className="settings-actions">
            <Button
              variant="contained"
              startIcon={<Send size={17} />}
              disabled={busy || !testEmail.to || !testEmail.subject || !testEmail.message}
              onClick={sendTest}
            >
              {t('sendTestEmail')}
            </Button>
          </Box>
        </Paper>
      </Box>

      <Snackbar open={Boolean(notice)} autoHideDuration={5000} onClose={() => setNotice(null)}>
        {notice && <Alert severity={notice.type} onClose={() => setNotice(null)}>{notice.text}</Alert>}
      </Snackbar>
    </>
  );
}
