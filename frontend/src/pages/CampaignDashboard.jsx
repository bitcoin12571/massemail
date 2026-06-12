import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Alert,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  MailCheck,
  MoreHorizontal,
  MousePointerClick,
  Trash2,
  Plus,
  Send,
  Sparkles,
  UsersRound
} from 'lucide-react';
import API, { getApiErrorMessage } from '../services/api';
import { useLanguage } from '../i18n.jsx';
import AnimatedStatCard from '../components/AnimatedStatCard';
import { containerVariants } from '../utils/animations';

export default function CampaignDashboard({ onOpenDatabase }) {
  const { t } = useLanguage();
  const [campaigns, setCampaigns] = useState([]);
  const [overview, setOverview] = useState({ contacts: 0, sent: 0, openRate: 0, clickRate: 0 });
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [notice, setNotice] = useState(null);
  const [period, setPeriod] = useState('30');
  const [periodAnchor, setPeriodAnchor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    htmlContent: '',
    textContent: ''
  });

  useEffect(() => {
    refresh();
  }, [period]);

  const refresh = () => Promise.all([fetchCampaigns(), fetchOverview()]);

  const fetchCampaigns = async () => {
    try {
      const response = await API.get('/campaigns', { params: { days: period } });
      setCampaigns(response.data);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchOverview = async () => {
    try {
      const response = await API.get('/campaigns/overview', { params: { days: period } });
      setOverview(response.data);
    } catch (error) {
      console.error('Error fetching overview:', error);
    }
  };

  const handleCreateCampaign = async () => {
    setLoading(true);
    try {
      await API.post('/campaigns', formData);
      setFormData({ name: '', subject: '', htmlContent: '', textContent: '' });
      setOpenDialog(false);
      setNotice({ type: 'success', text: 'Campaign created and saved as draft' });
      refresh();
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, 'Could not create campaign') });
    } finally {
      setLoading(false);
    }
  };

  const sendCampaign = async (campaign) => {
    setLoading(true);
    try {
      const { data } = await API.post(`/campaigns/${campaign.id}/send`);
      setNotice({ type: 'success', text: `${data.emailCount} emails added to the delivery queue` });
      refresh();
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, 'Could not send campaign') });
    } finally {
      setLoading(false);
    }
  };

  const deleteCampaign = async (campaign) => {
    if (!window.confirm(`Delete "${campaign.name}"?`)) return;
    setLoading(true);
    try {
      await API.delete(`/campaigns/${campaign.id}`);
      setNotice({ type: 'success', text: 'Campaign deleted' });
      refresh();
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, 'Could not delete campaign') });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Database records', value: overview.contacts, change: 'Active email addresses', icon: UsersRound, tone: 'violet' },
    { label: 'Emails processed', value: overview.sent, change: 'All time', icon: Send, tone: 'blue' },
    { label: 'Delivered', value: `${overview.openRate}%`, change: 'Provider events', icon: MailCheck, tone: 'green' },
    { label: 'Tracked responses', value: `${overview.clickRate}%`, change: 'Available events', icon: MousePointerClick, tone: 'orange' }
  ];
  const periods = [
    { value: '7', label: t('last7') },
    { value: '21', label: t('last3Weeks') },
    { value: '30', label: t('last30') },
    { value: '90', label: t('last90') },
    { value: '365', label: t('lastYear') },
    { value: '0', label: t('allTime') }
  ];
  const periodLabel = periods.find((option) => option.value === period)?.label;

  return (
    <>
      <Box className="page-heading">
        <Box>
          <Typography className="eyebrow">INTERNAL OPERATIONS</Typography>
          <Typography variant="h3">{t('historyTitle')}</Typography>
          <Typography color="text.secondary">{t('historySubtitle')}</Typography>
        </Box>
        <Stack direction="row" spacing={1.25}>
          <Button
            className="date-button"
            variant="outlined"
            startIcon={<CalendarDays size={18} />}
            onClick={(event) => setPeriodAnchor(event.currentTarget)}
          >
            {periodLabel} <ChevronDown size={15} />
          </Button>
          <Menu
            anchorEl={periodAnchor}
            open={Boolean(periodAnchor)}
            onClose={() => setPeriodAnchor(null)}
            PaperProps={{ sx: { mt: 1, minWidth: 210, borderRadius: 2 } }}
          >
            {periods.map((option) => (
              <MenuItem
                key={option.value}
                selected={period === option.value}
                onClick={() => {
                  setPeriod(option.value);
                  setPeriodAnchor(null);
                }}
              >
                {option.label}
              </MenuItem>
            ))}
          </Menu>
          <Button variant="contained" startIcon={<Send size={18} />} onClick={onOpenDatabase}>
            {t('sendEmailNow')}
          </Button>
        </Stack>
      </Box>

      <motion.div
        className="stats-grid"
        initial="hidden"
        animate="visible"
        variants={containerVariants(0.08)}
      >
        {statCards.map(({ label, value, change, icon: Icon, tone }, index) => (
          <AnimatedStatCard
            key={label}
            label={label}
            value={value}
            change={change}
            icon={Icon}
            tone={tone}
            index={index}
            animated
          />
        ))}
      </motion.div>

      <Box className="content-grid">
        <Paper className="campaign-panel">
          <Box className="panel-header">
            <Box>
              <Typography variant="h6">{t('recentSends')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('staffMessages')}</Typography>
            </Box>
            <Button variant="text" endIcon={<ArrowUpRight size={16} />}>View all</Button>
          </Box>

          {campaigns.length === 0 ? (
            <Box className="empty-state">
              <Box className="empty-visual">
                <Box className="floating-card card-one"><Sparkles size={16} /></Box>
                <Box className="mail-illustration">
                  <Box className="mail-flap" />
                  <MailCheck size={38} />
                </Box>
                <Box className="floating-card card-two"><Clock3 size={16} /></Box>
              </Box>
              <Typography variant="h5">{t('noEmails')}</Typography>
              <Typography color="text.secondary">
                Open the company database, select the recipients and send one message to everyone.
              </Typography>
              <Button variant="contained" startIcon={<Send size={18} />} onClick={onOpenDatabase}>
                {t('selectRecipients')}
              </Button>
            </Box>
          ) : (
            <Stack className="campaign-list">
              {campaigns.map((campaign) => (
                <Box className="campaign-row" key={campaign.id}>
                  <Box className="campaign-avatar"><Send size={18} /></Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={750}>{campaign.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{campaign.subject}</Typography>
                  </Box>
                  <Chip label={campaign.status} size="small" />
                  {campaign.status === 'draft' && (
                    <Button size="small" variant="contained" startIcon={<Send size={15} />} disabled={loading} onClick={() => sendCampaign(campaign)}>
                      Send
                    </Button>
                  )}
                  <IconButton color="error" onClick={() => deleteCampaign(campaign)}><Trash2 size={17} /></IconButton>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        <Paper className="activity-panel">
          <Box className="panel-header">
            <Box>
              <Typography variant="h6">{t('systemStatus')}</Typography>
              <Typography variant="body2" color="text.secondary">Internal delivery service</Typography>
            </Box>
            <IconButton><MoreHorizontal size={18} /></IconButton>
          </Box>
          <Box className="health-score">
            <Box className="score-ring system-ready"><span>OK</span></Box>
          </Box>
          <Typography textAlign="center" fontWeight={750}>{t('operational')}</Typography>
          <Typography textAlign="center" variant="body2" color="text.secondary">
            Email delivery service is available.
          </Typography>
          <Box className="progress-label">
            <span>Service availability</span><strong>100%</strong>
          </Box>
          <LinearProgress variant="determinate" value={100} color="success" />
          <Button fullWidth variant="outlined" onClick={onOpenDatabase}>{t('openDatabase')}</Button>
        </Paper>
      </Box>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h5" fontWeight={800}>Create a new campaign</Typography>
          <Typography variant="body2" color="text.secondary">Give your campaign a clear name and compelling content.</Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          <TextField label="Campaign name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          <TextField label="Email subject" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
          <TextField select label="Campaign type" defaultValue="regular">
            <MenuItem value="regular">Regular campaign</MenuItem>
            <MenuItem value="welcome">Welcome series</MenuItem>
          </TextField>
          <TextField label="HTML content" multiline rows={4} value={formData.htmlContent} onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })} />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button color="inherit" onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" disabled={loading || !formData.name || !formData.subject || !formData.htmlContent} onClick={handleCreateCampaign}>Create campaign</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={Boolean(notice)} autoHideDuration={4500} onClose={() => setNotice(null)}>
        {notice && <Alert severity={notice.type} onClose={() => setNotice(null)}>{notice.text}</Alert>}
      </Snackbar>
    </>
  );
}
