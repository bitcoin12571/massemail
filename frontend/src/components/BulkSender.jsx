import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Send, BarChart3, ImagePlus, Trash2, X } from 'lucide-react';
import API, { getApiErrorMessage } from '../services/api';
import { useLanguage } from '../i18n.jsx';

export default function BulkSender() {
  const { t } = useLanguage();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    htmlTemplate: ''
  });
  const [attachments, setAttachments] = useState([]);

  const statusLabel = (status) => {
    const labels = {
      draft: t('statusDraft'),
      pending: t('statusPending'),
      queued: t('statusQueued'),
      sending: t('statusSending'),
      completed: t('statusCompleted'),
      completed_with_errors: t('statusCompletedWithErrors'),
      sent: t('statusSent'),
      failed: t('statusFailed')
    };
    return labels[status] || status || '-';
  };

  const closeCreateDialog = () => {
    setOpenDialog(false);
    setFormData({ name: '', subject: '', htmlTemplate: '' });
    setAttachments([]);
  };

  useEffect(() => {
    fetchCampaigns();
    const handleCampaignsUpdate = () => fetchCampaigns();
    window.addEventListener('mailora:campaigns-updated', handleCampaignsUpdate);
    return () => window.removeEventListener('mailora:campaigns-updated', handleCampaignsUpdate);
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data } = await API.get('/bulk-sender/campaigns');
      setCampaigns(data.campaigns || []);
    } catch (error) {
      setCampaigns([]);
    }
  };

  const handleCreateCampaign = async () => {
    if (!formData.name || !formData.subject || !formData.htmlTemplate) {
      setNotice({ type: 'error', text: t('allFieldsRequired') });
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('subject', formData.subject);
      payload.append('htmlTemplate', formData.htmlTemplate);
      attachments.forEach(file => payload.append('attachments', file));

      const { data } = await API.post('/bulk-sender/campaign', payload);
      setCampaigns(current => [data.campaign, ...current.filter(campaign => campaign.id !== data.campaign.id)]);
      closeCreateDialog();
      setNotice({ type: 'success', text: t('campaignCreatedSuccess') });
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, t('campaignCreatedError')) });
    } finally {
      setLoading(false);
    }
  };

  const handleAttachmentChange = (event) => {
    const files = [...(event.target.files || [])];
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length !== files.length) {
      setNotice({ type: 'error', text: t('bulkImageOnly') });
      event.target.value = '';
      return;
    }

    setAttachments(current => [...current, ...imageFiles]);
    event.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(current => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSendCampaign = async (campaignId) => {
    setLoading(true);
    try {
      const campaign = campaigns.find(item => item.id === campaignId);
      const contactsResponse = await API.get('/contacts', { params: { limit: 500 } });
      const recipients = contactsResponse.data.contacts || [];

      const { data } = await API.post(`/bulk-sender/campaign/${campaignId}/send`, {
        campaign,
        recipients
      });

      window.dispatchEvent(new Event('mailora:history-updated'));
      setNotice({ type: 'success', text: t('campaignSentSuccess', { count: data.sentCount }) });
      setCampaigns(current => current.map(item => item.id === campaignId
        ? {
            ...item,
            status: 'completed',
            totalRecipients: data.totalRecipients,
            sentCount: data.sentCount,
            failedCount: data.failedCount
          }
        : item));
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, t('campaignSendError')) });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm(t('confirmDelete'))) return;

    setLoading(true);
    try {
      await API.delete(`/bulk-sender/campaign/${campaignId}`);
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
      setNotice({ type: 'success', text: t('campaignDeletedSuccess') });
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, t('campaignDeleteError')) });
    } finally {
      setLoading(false);
    }
  };

  const handleViewStats = async (campaignId) => {
    const campaign = campaigns.find(item => String(item.id) === String(campaignId));
    try {
      const { data } = await API.get(`/bulk-sender/campaign/${campaignId}/stats`);
      setSelectedCampaign(data);
    } catch (error) {
      if (campaign) {
        const totalRecipients = Number(campaign.totalRecipients) || 0;
        setSelectedCampaign({
          campaign,
          openRate: totalRecipients ? ((Number(campaign.openedCount || 0) / totalRecipients) * 100).toFixed(2) : 0,
          clickRate: totalRecipients ? ((Number(campaign.clickedCount || 0) / totalRecipients) * 100).toFixed(2) : 0,
          bounceRate: totalRecipients ? ((Number(campaign.failedCount || 0) / totalRecipients) * 100).toFixed(2) : 0
        });
      } else {
        setNotice({ type: 'error', text: getApiErrorMessage(error, t('statsLoadError')) });
      }
    }
  };

  return (
    <>
      <Box className="page-heading">
        <Box>
          <Typography className="eyebrow">{t('bulkSenderEyebrow')}</Typography>
          <Typography variant="h3">{t('bulkSenderTitle')}</Typography>
          <Typography color="text.secondary">{t('bulkSenderSubtitle')}</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Send size={18} />}
        onClick={() => setOpenDialog(true)}
        >
          {t('newCampaignBtn')}
        </Button>
      </Box>

      {/* Campaigns List */}
      <Paper className="bulk-campaigns-table" sx={{ overflowX: 'auto' }}>
        {campaigns.length > 0 ? (
          <Table>
            <TableHead>
                <TableRow>
                <TableCell>{t('campaignNameHeader')}</TableCell>
                <TableCell>{t('statusHeader')}</TableCell>
                <TableCell align="right">{t('recipientsHeader')}</TableCell>
                <TableCell align="right">{t('sentHeader')}</TableCell>
                <TableCell align="right">{t('failedHeader')}</TableCell>
                <TableCell align="center">{t('actionsHeader')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id} hover>
                  <TableCell>{campaign.name}</TableCell>
                  <TableCell>
                    <Typography variant="caption" className={`status-pill status-${campaign.status || 'pending'}`}>
                      {statusLabel(campaign.status)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{campaign.totalRecipients}</TableCell>
                  <TableCell align="right">{campaign.sentCount}</TableCell>
                  <TableCell align="right">{campaign.failedCount}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<BarChart3 size={16} />}
                        onClick={() => handleViewStats(campaign.id)}
                      >
                        {t('statsBtn')}
                      </Button>
                      {campaign.status === 'draft' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<Send size={16} />}
                          onClick={() => handleSendCampaign(campaign.id)}
                          disabled={loading}
                        >
                          {t('sendBtn')}
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<Trash2 size={16} />}
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        disabled={loading}
                      >
                        {t('deleteBtn')}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">{t('noCampaigns')}</Typography>
          </Box>
        )}
      </Paper>

      <Stack className="bulk-campaigns-mobile" spacing={2}>
        {campaigns.length > 0 ? campaigns.map((campaign) => (
          <Paper className="bulk-campaign-card" key={campaign.id}>
            <Box className="bulk-card-header">
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" noWrap>{campaign.name}</Typography>
                <Typography variant="body2" color="text.secondary">{campaign.subject}</Typography>
              </Box>
              <Typography variant="caption" className={`bulk-status bulk-status-${campaign.status}`}>
                {statusLabel(campaign.status)}
              </Typography>
            </Box>

            <Box className="bulk-card-stats">
              <Box>
                <Typography variant="caption" color="text.secondary">{t('recipientsHeader')}</Typography>
                <Typography fontWeight={700}>{campaign.totalRecipients}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('sentHeader')}</Typography>
                <Typography fontWeight={700}>{campaign.sentCount}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('failedHeader')}</Typography>
                <Typography fontWeight={700}>{campaign.failedCount}</Typography>
              </Box>
            </Box>

            <Stack className="bulk-card-actions" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<BarChart3 size={16} />}
                onClick={() => handleViewStats(campaign.id)}
              >
                {t('statsBtn')}
              </Button>
              {campaign.status === 'draft' && (
                <Button
                  variant="contained"
                  startIcon={<Send size={16} />}
                  onClick={() => handleSendCampaign(campaign.id)}
                  disabled={loading}
                >
                  {t('sendBtn')}
                </Button>
              )}
              <Button
                variant="outlined"
                color="error"
                startIcon={<Trash2 size={16} />}
                onClick={() => handleDeleteCampaign(campaign.id)}
                disabled={loading}
              >
                {t('deleteBtn')}
              </Button>
            </Stack>
          </Paper>
        )) : (
          <Paper className="bulk-campaign-card">
            <Typography color="text.secondary" textAlign="center">{t('noCampaigns')}</Typography>
          </Paper>
        )}
      </Stack>

      {/* Create Campaign Dialog */}
      <Dialog className="responsive-dialog" open={openDialog} onClose={closeCreateDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('createCampaignTitle')}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label={t('campaignNameLabel')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('campaignSubjectLabel')}
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('htmlTemplateLabel')}
              value={formData.htmlTemplate}
              onChange={(e) => setFormData({ ...formData, htmlTemplate: e.target.value })}
              multiline
              rows={6}
              fullWidth
              helperText={t('htmlTemplateHelper')}
            />
            <Box>
              <Button component="label" variant="outlined" startIcon={<ImagePlus size={18} />}>
                {t('bulkAddImage')}
                <input hidden type="file" accept="image/*" multiple onChange={handleAttachmentChange} />
              </Button>
              {attachments.length > 0 && (
                <Stack spacing={1} sx={{ mt: 1.25 }}>
                  {attachments.map((file, index) => (
                    <Paper
                      key={`${file.name}-${index}`}
                      variant="outlined"
                      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, p: 1.25 }}
                    >
                      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box
                          component="img"
                          src={URL.createObjectURL(file)}
                          alt=""
                          sx={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 1 }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={700} noWrap>{file.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                        </Box>
                      </Stack>
                      <Button size="small" color="error" startIcon={<X size={15} />} onClick={() => removeAttachment(index)}>
                        {t('deleteBtn')}
                      </Button>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions className="responsive-dialog-actions">
          <Button onClick={closeCreateDialog}>{t('cancelBtn')}</Button>
          <Button
            variant="contained"
            onClick={handleCreateCampaign}
            disabled={loading}
          >
            {t('createBtn')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Campaign Stats Modal */}
      {selectedCampaign && (
        <Dialog className="responsive-dialog" open={!!selectedCampaign} onClose={() => setSelectedCampaign(null)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('campaignStatsTitle')}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2">{t('campaignLabel', { name: selectedCampaign.campaign.name })}</Typography>
                <Typography variant="caption" color="text.secondary">{t('createdLabel', { date: new Date(selectedCampaign.campaign.createdAt).toLocaleDateString() })}</Typography>
              </Box>

              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>{t('totalRecipientsLabel')}</Typography>
                  <Typography variant="subtitle2">{selectedCampaign.campaign.totalRecipients}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>{t('sentLabel')}</Typography>
                  <Typography variant="subtitle2">{selectedCampaign.campaign.sentCount}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>{t('failedLabel')}</Typography>
                  <Typography variant="subtitle2">{selectedCampaign.campaign.failedCount}</Typography>
                </Box>
              </Stack>

              <Stack spacing={2}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption">{t('openRateLabel')}</Typography>
                    <Typography variant="caption">{selectedCampaign.openRate}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={parseFloat(selectedCampaign.openRate)} />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption">{t('clickRateLabel')}</Typography>
                    <Typography variant="caption">{selectedCampaign.clickRate}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={parseFloat(selectedCampaign.clickRate)} />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption">{t('bounceRateLabel')}</Typography>
                    <Typography variant="caption">{selectedCampaign.bounceRate}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={parseFloat(selectedCampaign.bounceRate)} color="error" />
                </Box>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedCampaign(null)}>{t('closeBtn')}</Button>
          </DialogActions>
        </Dialog>
      )}

      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice(null)}>
        {notice && <Alert severity={notice.type}>{notice.text}</Alert>}
      </Snackbar>
    </>
  );
}
