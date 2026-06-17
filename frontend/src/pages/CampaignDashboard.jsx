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
  Divider,
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
  CalendarDays,
  ChevronDown,
  Clock3,
  MailCheck,
  MoreHorizontal,
  MousePointerClick,
  BarChart3,
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
import { getLocalSendHistory, removeLocalSendHistory } from '../utils/localHistory';

export default function CampaignDashboard({ onOpenDatabase }) {
  const { t } = useLanguage();
  const [campaigns, setCampaigns] = useState([]);
  const [overview, setOverview] = useState({ contacts: 0, sent: 0, openRate: 0, clickRate: 0 });
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [sendDialog, setSendDialog] = useState(false);
  const [campaignToSend, setCampaignToSend] = useState(null);
  const [sendContacts, setSendContacts] = useState([]);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [notice, setNotice] = useState(null);
  const [selectedStats, setSelectedStats] = useState(null);
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
    const handleHistoryUpdate = () => refresh();
    window.addEventListener('mailora:history-updated', handleHistoryUpdate);
    return () => window.removeEventListener('mailora:history-updated', handleHistoryUpdate);
  }, [period]);

  const refresh = () => Promise.all([fetchCampaigns(), fetchOverview()]);

  const fetchCampaigns = async () => {
    const localCampaigns = filterLocalHistory(getLocalSendHistory());
    try {
      const response = await API.get('/campaigns', { params: { days: period } });
      const serverCampaigns = response.data.map(campaign => normalizeCampaign(campaign, 'server'));
      setCampaigns(mergeCampaignHistory(localCampaigns.map(campaign => normalizeCampaign(campaign)), serverCampaigns));
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setCampaigns(localCampaigns.map(campaign => normalizeCampaign(campaign)));
    }
  };

  const fetchOverview = async () => {
    const localCampaigns = filterLocalHistory(getLocalSendHistory());
    const localSent = localCampaigns.reduce((sum, campaign) => sum + campaign.sentCount, 0);
    const localFailed = localCampaigns.reduce((sum, campaign) => sum + campaign.failedCount, 0);
    const localTotal = localSent + localFailed;
    try {
      const response = await API.get('/campaigns/overview', { params: { days: period } });
      setOverview({
        ...response.data,
        sent: response.data.sent + localSent,
        failed: localFailed,
        successRate: localTotal ? Math.round((localSent / localTotal) * 100) : 0
      });
    } catch (error) {
      console.error('Error fetching overview:', error);
      setOverview({
        contacts: 0,
        sent: localSent,
        failed: localFailed,
        successRate: localTotal ? Math.round((localSent / localTotal) * 100) : 0
      });
    }
  };

  const filterLocalHistory = (history) => {
    const days = Number(period);
    if (!days) return history;
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
    return history.filter(entry => new Date(entry.sentAt || entry.createdAt).getTime() >= threshold);
  };

  const getNumber = (...values) => {
    const value = values.find((candidate) => Number.isFinite(Number(candidate)) && Number(candidate) > 0);
    return Number(value) || 0;
  };

  const normalizeCampaign = (campaign, source = campaign.source || 'local') => {
    const sentCount = getNumber(campaign.sentCount, campaign.sent, campaign.emailCount);
    const failedCount = getNumber(campaign.failedCount, campaign.failed);
    const pendingCount = getNumber(campaign.pendingCount, campaign.pending);
    const totalRecipients = getNumber(
      campaign.totalRecipients,
      campaign.recipientCount,
      campaign.emailCount,
      sentCount + failedCount + pendingCount
    );

    return {
      ...campaign,
      source,
      totalRecipients,
      sentCount,
      failedCount,
      pendingCount,
      openedCount: getNumber(campaign.openedCount, campaign.opened),
      clickedCount: getNumber(campaign.clickedCount, campaign.clicked),
      status: campaign.status || (failedCount ? 'completed_with_errors' : 'completed')
    };
  };

  const mergeCampaignHistory = (...groups) => {
    const merged = new Map();

    groups.flat().forEach((campaign) => {
      const existing = merged.get(campaign.id);
      if (!existing) {
        merged.set(campaign.id, campaign);
        return;
      }

      merged.set(campaign.id, {
        ...existing,
        ...campaign,
        totalRecipients: Math.max(existing.totalRecipients || 0, campaign.totalRecipients || 0),
        sentCount: Math.max(existing.sentCount || 0, campaign.sentCount || 0),
        failedCount: Math.max(existing.failedCount || 0, campaign.failedCount || 0),
        pendingCount: Math.max(existing.pendingCount || 0, campaign.pendingCount || 0),
        openedCount: Math.max(existing.openedCount || 0, campaign.openedCount || 0),
        clickedCount: Math.max(existing.clickedCount || 0, campaign.clickedCount || 0),
        source: campaign.source === 'server' ? 'server' : existing.source
      });
    });

    return [...merged.values()]
      .sort((left, right) => new Date(right.sentAt || right.createdAt) - new Date(left.sentAt || left.createdAt));
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

  const openSendDialog = async (campaign) => {
    try {
      const { data } = await API.get('/contacts', { params: { limit: 500 } });
      setSendContacts(data.contacts || []);
      setSelectedContactIds((data.contacts || []).map(c => c.id));
      setCampaignToSend(campaign);
      setSendDialog(true);
    } catch (error) {
      setNotice({ type: 'error', text: 'Could not load contacts' });
    }
  };

  const handleSendCampaign = async () => {
    if (!selectedContactIds.length) {
      setNotice({ type: 'error', text: 'Select at least one contact' });
      return;
    }
    setLoading(true);
    try {
      const { data } = await API.post(`/campaigns/${campaignToSend.id}/send`, { contactIds: selectedContactIds });
      setNotice({ type: 'success', text: `${data.emailCount} emails added to the delivery queue` });
      setSendDialog(false);
      refresh();
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, 'Could not send campaign') });
    } finally {
      setLoading(false);
    }
  };

  const deleteCampaign = async (campaign) => {
    if (!window.confirm(`Delete "${campaign.name}"?`)) return;
    if (campaign.source !== 'server') {
      removeLocalSendHistory(campaign.id);
      refresh();
      return;
    }
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
    { label: 'Campanii', value: campaigns.length, change: 'În perioada selectată', icon: UsersRound, tone: 'violet' },
    { label: 'Emailuri trimise', value: overview.sent || 0, change: 'Livrări reușite', icon: Send, tone: 'blue' },
    { label: 'Rată de succes', value: `${overview.successRate ?? overview.openRate ?? 0}%`, change: 'Trimise fără eroare', icon: MailCheck, tone: 'green' },
    { label: 'Emailuri eșuate', value: overview.failed || 0, change: 'Necesită verificare', icon: MousePointerClick, tone: 'orange' }
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
            <Typography variant="body2" color="text.secondary">{campaigns.length} campanii</Typography>
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
                <Box key={campaign.id}>
                  {/* Campaign Header */}
                  <Box className="campaign-row">
                    <Box className="campaign-avatar"><Send size={18} /></Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={750}>{campaign.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{campaign.subject}</Typography>
                    </Box>
                    <Chip label={campaign.status} size="small" />
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<BarChart3 size={15} />}
                      onClick={() => setSelectedStats(campaign)}
                    >
                      Statistici
                    </Button>
                    {campaign.status === 'draft' && (
                      <Button size="small" variant="contained" startIcon={<Send size={15} />} disabled={loading} onClick={() => openSendDialog(campaign)}>
                        Send
                      </Button>
                    )}
                    <IconButton color="error" onClick={() => deleteCampaign(campaign)}><Trash2 size={17} /></IconButton>
                  </Box>

                  {/* Individual Recipients List */}
                  {campaign.recipients && campaign.recipients.length > 0 && (
                    <Box sx={{
                      pl: 5,
                      pt: 2,
                      pb: 2,
                      borderLeft: '3px solid #7c3aed',
                      backgroundColor: '#f9f5ff'
                    }}>
                      {campaign.recipients.slice(0, 5).map((recipient, idx) => {
                        const sentDate = new Date(recipient.sentAt);
                        const dateStr = sentDate.toLocaleDateString('ro-RO', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        });
                        const timeStr = sentDate.toLocaleTimeString('ro-RO', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        });

                        return (
                          <Box
                            key={idx}
                            sx={{
                              py: 1.5,
                              px: 2,
                              mb: 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              backgroundColor: 'white',
                              borderRadius: 1,
                              border: '1px solid #e5e7eb',
                              '&:hover': { backgroundColor: '#fafafa' }
                            }}
                          >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                                {recipient.email}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#6b7280', mt: 0.5, display: 'block' }}>
                                📅 {dateStr} • 🕐 {timeStr}
                              </Typography>
                            </Box>
                            <Chip
                              label={recipient.status === 'sent' ? '✅ Trimis cu succes' : '❌ Eșuat'}
                              size="small"
                              sx={{
                                backgroundColor: recipient.status === 'sent' ? '#d1fae5' : '#fee2e2',
                                color: recipient.status === 'sent' ? '#065f46' : '#991b1b',
                                fontWeight: 600,
                                minWidth: 'max-content'
                              }}
                            />
                          </Box>
                        );
                      })}
                      {campaign.recipients.length > 5 && (
                        <Box sx={{
                          mt: 1.5,
                          pt: 1.5,
                          borderTop: '1px solid #e5e7eb',
                          pl: 2
                        }}>
                          <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
                            ➕ {campaign.recipients.length - 5} alte emailuri trimise
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
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

      <Dialog className="responsive-dialog" open={Boolean(selectedStats)} onClose={() => setSelectedStats(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: 'white', pb: 3 }}>
          <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>📊 Statistici Campanie</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>{selectedStats?.name}</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 5.5, pb: 3, px: 4 }}>
          {selectedStats && (
            <Stack spacing={2.5}>
              {/* Top 4 Stats Grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3.5 }}>
                {/* Destinatari */}
                <Box sx={{
                  p: 2,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #e0e7ff 0%, #f0f4ff 100%)',
                  border: '1px solid #c7d2fe',
                  textAlign: 'center'
                }}>
                  <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 600, textTransform: 'uppercase' }}>
                    👥 Destinatari
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#4f46e5', mt: 1 }}>
                    {selectedStats.totalRecipients || 0}
                  </Typography>
                </Box>

                {/* Trimise */}
                <Box sx={{
                  p: 2,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #dcfce7 0%, #ecfdf5 100%)',
                  border: '1px solid #86efac',
                  textAlign: 'center'
                }}>
                  <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 600, textTransform: 'uppercase' }}>
                    ✅ Trimise
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#16a34a', mt: 1 }}>
                    {selectedStats.sentCount || 0}
                  </Typography>
                </Box>

                {/* Eșuate */}
                <Box sx={{
                  p: 2,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)',
                  border: '1px solid #fca5a5',
                  textAlign: 'center'
                }}>
                  <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, textTransform: 'uppercase' }}>
                    ❌ Eșuate
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#dc2626', mt: 1 }}>
                    {selectedStats.failedCount || 0}
                  </Typography>
                </Box>

                {/* Rată Succes */}
                <Box sx={{
                  p: 2,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fefce8 100%)',
                  border: '1px solid #fcd34d',
                  textAlign: 'center'
                }}>
                  <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 600, textTransform: 'uppercase' }}>
                    📈 Rată Succes
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#b45309', mt: 1 }}>
                    {selectedStats.totalRecipients ? Math.round(((selectedStats.sentCount || 0) / selectedStats.totalRecipients) * 100) : 0}%
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 1 }} />

              {/* Subiect */}
              <Box sx={{
                p: 2,
                borderRadius: 2,
                background: '#f9fafb',
                border: '1px solid #e5e7eb'
              }}>
                <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                  📨 Subiect
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.75, color: '#1f2937', wordBreak: 'break-word' }}>
                  {selectedStats.subject || '-'}
                </Typography>
              </Box>

              {/* Data Trimiterii */}
              <Box sx={{
                p: 2,
                borderRadius: 2,
                background: '#f9fafb',
                border: '1px solid #e5e7eb'
              }}>
                <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                  🕐 Data Trimiterii
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.75, color: '#1f2937' }}>
                  {new Date(selectedStats.sentAt || selectedStats.createdAt).toLocaleString('ro-RO', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </Typography>
              </Box>

              {/* Success Rate Progress Bar */}
              {selectedStats.totalRecipients > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#374151' }}>
                      Progres Livrare
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#16a34a' }}>
                      {Math.round(((selectedStats.sentCount || 0) / selectedStats.totalRecipients) * 100)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.round(((selectedStats.sentCount || 0) / selectedStats.totalRecipients) * 100)}
                    sx={{
                      height: 8,
                      borderRadius: 10,
                      backgroundColor: '#e5e7eb',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                        borderRadius: 10
                      }
                    }}
                  />
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
          <Button
            variant="contained"
            onClick={() => setSelectedStats(null)}
            sx={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              color: 'white',
              fontWeight: 700,
              px: 3
            }}
          >
            Închide
          </Button>
        </DialogActions>
      </Dialog>

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

      <Dialog open={sendDialog} onClose={() => setSendDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h5" fontWeight={800}>Select recipients</Typography>
          <Typography variant="body2" color="text.secondary">Choose which contacts to send this campaign to.</Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: '12px !important', maxHeight: '400px', overflow: 'auto' }}>
          {sendContacts.map((contact) => (
            <Box key={contact.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}>
              <input
                type="checkbox"
                checked={selectedContactIds.includes(contact.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedContactIds([...selectedContactIds, contact.id]);
                  } else {
                    setSelectedContactIds(selectedContactIds.filter(id => id !== contact.id));
                  }
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600}>{contact.email}</Typography>
                <Typography variant="caption" color="text.secondary">{contact.name || 'No name'}</Typography>
              </Box>
            </Box>
          ))}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button color="inherit" onClick={() => setSendDialog(false)}>Cancel</Button>
          <Button variant="contained" disabled={loading || !selectedContactIds.length} onClick={handleSendCampaign}>Send to {selectedContactIds.length}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(notice)} autoHideDuration={4500} onClose={() => setNotice(null)}>
        {notice && <Alert severity={notice.type} onClose={() => setNotice(null)}>{notice.text}</Alert>}
      </Snackbar>
    </>
  );
}
