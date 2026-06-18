import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import { LockKeyhole } from 'lucide-react';
import API, { getApiErrorMessage } from '../services/api';
import smartGrowthLogo from '../assets/smart-growth-ai-logo.png';
import { useLanguage } from '../i18n.jsx';

export default function Login({ onLogin }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await API.post('/auth/login', { email, password });
      onLogin(data.token, data.user);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t('signInError')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="login-shell">
      <Paper component="form" className="login-card" onSubmit={submit}>
        <Box className="login-brand">
          <Box
            component="img"
            className="brand-logo"
            src={smartGrowthLogo}
            alt="Smart Growth AI"
          />
          <Box>
            <Typography variant="h5">Smart Growth AI</Typography>
            <Typography variant="body2" color="text.secondary">{t('adminAccess')}</Typography>
          </Box>
        </Box>

        <Box className="login-heading">
          <LockKeyhole size={28} />
          <Typography variant="h4" fontWeight={800}>{t('signIn')}</Typography>
          <Typography color="text.secondary">
            {t('loginHelp')}
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          fullWidth
        />
        <Button type="submit" variant="contained" size="large" disabled={loading}>
          {loading ? t('signingIn') : t('signIn')}
        </Button>
      </Paper>
    </Box>
  );
}
