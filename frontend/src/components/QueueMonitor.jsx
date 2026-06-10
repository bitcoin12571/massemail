import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Typography
} from '@mui/material';
import { CheckCircle2, Clock3, RefreshCw, RotateCcw, Trash2, Zap } from 'lucide-react';
import API, { getApiErrorMessage } from '../services/api';
import { useLanguage } from '../i18n.jsx';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import QueueVisualization from './QueueVisualization';
import { slideUp, containerVariants } from '../utils/animations';

const emptyStats = { waiting: 0, active: 0, completed: 0, failed: 0, total: 0 };

export default function QueueMonitor() {
  const { t } = useLanguage();
  const { preferences, updatePreference, REFRESH_INTERVALS } = useUserPreferences();
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchStats = async () => {
    try {
      const { data } = await API.get('/campaigns/stats/queue');
      setStats(data);
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, 'Could not connect to the queue') });
    }
  };

  useEffect(() => {
    fetchStats();
    if (!preferences.autoRefreshQueue || !preferences.refreshInterval) return undefined;
    const interval = setInterval(fetchStats, preferences.refreshInterval);
    return () => clearInterval(interval);
  }, [preferences.autoRefreshQueue, preferences.refreshInterval]);

  const action = async (endpoint, successText) => {
    setLoading(true);
    try {
      await API.post(endpoint);
      setNotice({ type: 'success', text: successText });
      fetchStats();
    } finally {
      setLoading(false);
    }
  };

  const progress = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  const cards = [
    { label: t('waiting'), value: stats.waiting, icon: Clock3, tone: 'orange' },
    { label: t('sendingNow'), value: stats.active, icon: Zap, tone: 'blue' },
    { label: t('delivered'), value: stats.completed, icon: CheckCircle2, tone: 'green' },
    { label: t('failed'), value: stats.failed, icon: RotateCcw, tone: 'red' }
  ];

  return (
    <>
      <Box className="page-heading">
        <Box>
          <Typography className="eyebrow">DELIVERY</Typography>
          <Typography variant="h3">{t('deliveryTitle')}</Typography>
          <Typography color="text.secondary">{t('deliverySubtitle')}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <Chip
              label={preferences.autoRefreshQueue ? `Live updates: ${REFRESH_INTERVALS.find(i => i.value === preferences.refreshInterval)?.label || 'Manual'}` : 'Live updates off'}
              color={preferences.autoRefreshQueue ? 'success' : 'default'}
              onClick={() => updatePreference('autoRefreshQueue', !preferences.autoRefreshQueue)}
              sx={{ transition: 'all 0.3s ease' }}
            />
          </motion.div>
          <Button variant="outlined" startIcon={<RefreshCw size={17} />} disabled={loading} onClick={fetchStats}>{t('refresh')}</Button>
        </Stack>
      </Box>

      <motion.div
        className="stats-grid"
        initial="hidden"
        animate="visible"
        variants={containerVariants(0.08)}
      >
        {cards.map(({ label, value, icon: Icon, tone }, index) => (
          <motion.div key={label} variants={slideUp}>
            <Paper className="stat-card">
              <Box className={`stat-icon ${tone}`}><Icon size={20} /></Box>
              <Typography color="text.secondary" fontWeight={600}>{label}</Typography>
              <Typography className="stat-value">{value}</Typography>
              <Typography className="stat-change">Email jobs</Typography>
            </Paper>
          </motion.div>
        ))}
      </motion.div>

      <Paper className="queue-panel">
        <Box className="panel-header">
          <Box>
            <Typography variant="h6">{t('deliveryProgress')}</Typography>
            <Typography variant="body2" color="text.secondary">Current session activity</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" color="error" startIcon={<Trash2 size={16} />} disabled={!stats.failed || loading} onClick={() => action('/campaigns/stats/queue/clear', t('clearFailed'))}>{t('clearFailed')}</Button>
            <Button variant="contained" startIcon={<RotateCcw size={16} />} disabled={!stats.failed || loading} onClick={() => action('/campaigns/stats/queue/retry', t('retryFailed'))}>{t('retryFailed')}</Button>
          </Stack>
        </Box>

        {stats.total > 0 ? (
          <QueueVisualization stats={stats} />
        ) : (
          <Box className="queue-empty">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <Zap size={28} />
            </motion.div>
            <Typography variant="h6">{t('queueReady')}</Typography>
            <Typography color="text.secondary">{t('queueReadyHelp')}</Typography>
          </Box>
        )}
      </Paper>
      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice(null)}>
        {notice && <Alert severity={notice.type} onClose={() => setNotice(null)}>{notice.text}</Alert>}
      </Snackbar>
    </>
  );
}
