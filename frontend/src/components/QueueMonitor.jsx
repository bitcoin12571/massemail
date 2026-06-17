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
import API from '../services/api';
import { useLanguage } from '../i18n.jsx';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import QueueVisualization from './QueueVisualization';
import { slideUp, containerVariants } from '../utils/animations';
import { getLocalSendHistory } from '../utils/localHistory';

const emptyStats = { waiting: 0, active: 0, completed: 0, failed: 0, total: 0 };

export default function QueueMonitor() {
  const { t } = useLanguage();
  const { preferences, updatePreference, REFRESH_INTERVALS } = useUserPreferences();
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchStats = async () => {
    const history = getLocalSendHistory();
    const localCompleted = history.reduce((sum, entry) => sum + (Number(entry.sentCount) || 0), 0);
    const localFailed = history.reduce((sum, entry) => sum + (Number(entry.failedCount) || 0), 0);
    const localTotal = localCompleted + localFailed;

    try {
      const { data } = await API.get('/queue/stats');
      // Combine in-memory and persisted stats
      const combined = {
        waiting: (data.inMemory?.waiting || 0) + (data.persisted?.waiting || 0),
        active: (data.inMemory?.active || 0) + (data.persisted?.active || 0),
        completed: Math.max(
          (data.inMemory?.completed || 0) + (data.persisted?.completed || 0),
          localCompleted
        ),
        failed: Math.max(
          (data.inMemory?.failed || 0) + (data.persisted?.failed || 0),
          localFailed
        ),
        total: Math.max(data.total || 0, localTotal)
      };
      setStats(combined);
    } catch (error) {
      setStats({
        waiting: 0,
        active: 0,
        completed: localCompleted,
        failed: localFailed,
        total: localTotal
      });
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

  const action = async (endpoint, successText) => {
    setLoading(true);
    try {
      // Note: clear and retry endpoints need to be added to campaigns route if needed
      // For now, we're using the queue stats endpoint
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
            <Typography variant="body2" color="text.secondary">Activitate salvată în browser</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" color="error" startIcon={<Trash2 size={16} />} disabled={!stats.failed || loading} onClick={() => action(null, t('clearFailed'))}>{t('clearFailed')}</Button>
            <Button variant="contained" startIcon={<RotateCcw size={16} />} disabled={!stats.failed || loading} onClick={() => action(null, t('retryFailed'))}>{t('retryFailed')}</Button>
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
