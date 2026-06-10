import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import { LockKeyhole, Mail } from 'lucide-react';
import API, { getApiErrorMessage } from '../services/api';

export default function Login({ onLogin }) {
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
      setError(getApiErrorMessage(requestError, 'Could not sign in'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="login-shell">
      <Paper component="form" className="login-card" onSubmit={submit}>
        <Box className="login-brand">
          <Box className="brand-mark"><Mail size={22} strokeWidth={2.5} /></Box>
          <Box>
            <Typography variant="h5">Mail Center</Typography>
            <Typography variant="body2" color="text.secondary">Administrator access</Typography>
          </Box>
        </Box>

        <Box className="login-heading">
          <LockKeyhole size={28} />
          <Typography variant="h4" fontWeight={800}>Sign in</Typography>
          <Typography color="text.secondary">
            Authentication is required before contacts or email tools can be accessed.
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
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </Paper>
    </Box>
  );
}
