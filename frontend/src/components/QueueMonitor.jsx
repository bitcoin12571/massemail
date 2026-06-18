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
const toCount = (value) => Number(value) || 0;

export default function QueueMonitor() {
  const { t } = useLanguage();
  const { preferences, updatePreference, REFRESH_INTERVALS } = useUserPreferences();
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchStats = async () => {
    try {
      const { data } = await API.get('/queue/stats');
      const combined = {
        waiting: toCount(data.inMemory?.waiting) + toCount(data.persisted?.waiting),
        active: toCount(data.inMemory?.active) + toCount(data.persisted?.active),
        completed: toCount(data.inMemory?.completed) + toCount(data.persisted?.completed),
        failed: toCount(data.inMemory?.failed) + toCount(data.persisted?.failed),
        total: toCount(data.total)
      };
      setStats(combined);
    } catch (error) {
      setStats(emptyStats);
    }
  };

  useEffect(() => {
    fetchStats();
    const handleHistoryUpdate = () => fetchStats();
    window.addEventListener('mailora:history-updated', handleHistoryUpdate);

    const interval = preferences.autoRefreshQueue && preferences.refreshInterval
      ? setInterval(fetchStats, preferences.refreshInterval)
      : null;

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('mailora:history-updated', handleHistoryUpdate);
    };
  }, [preferences.autoRefreshQueue, preferences.refreshInterval]);

  const action = async (endpoint, successText, countKey) => {
    setLoading(true);
    try {
      const { data } = await API.post(endpoint);
      const count = Number(data[countKey]) || 0;
      setNotice({
        type: 'success',
        text: count ? `${successText}: ${count}` : t('noFailedJobs')
      });
      await fetchStats();
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, t('queueActionFailed')) });
    } finally {
      setLoading(false);
    }
  };

  const progress = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  const failedCount = toCount(stats.failed);
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
          <Typography className="eyebrow">{t('deliveryEyebrow')}</Typography>
          <Typography variant="h3">{t('deliveryTitle')}</Typography>
          <Typography color="text.secondary">{t('deliverySubtitle')}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
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
              <Typography className="stat-change">{t('emailJobsLabel')}</Typography>
            </Paper>
          </motion.div>
        ))}
      </motion.div>

      <Paper className="queue-panel">
        <Box className="panel-header">
          <Box>
            <Typography variant="h6">{t('deliveryProgress')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('deliveryActivityHelp')}</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" color="error" startIcon={<Trash2 size={16} />} disabled={failedCount <= 0 || loading} onClick={() => action('/queue/failed/clear', t('failedCleared'), 'cleared')}>{t('clearFailed')}</Button>
            <Button variant="contained" startIcon={<RotateCcw size={16} />} disabled={failedCount <= 0 || loading} onClick={() => action('/queue/failed/retry', t('failedRetried'), 'retried')}>{t('retryFailed')}</Button>
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
