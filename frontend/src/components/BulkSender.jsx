import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Alert,
  Box,
  Button,
  Card,
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
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { Send, BarChart3, Trash2, Eye, Click, AlertCircle } from 'lucide-react';
import API, { getApiErrorMessage } from '../services/api';
import { useLanguage } from '../i18n.jsx';

export default function BulkSender() {
  const { t } = useLanguage();
  const [campaigns, setCampaigns] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    htmlTemplate: '',
    region: ''
  });

  useEffect(() => {
    fetchCampaigns();
    fetchRegions();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data } = await API.get('/bulk-sender/campaigns');
      setCampaigns(data.campaigns);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    }
  };

  const fetchRegions = async () => {
    try {
      const { data } = await API.get('/parser/regions');
      setRegions(data.regions);
    } catch (error) {
      console.error('Failed to fetch regions:', error);
    }
  };

  const handleCreateCampaign = async () => {
    if (!formData.name || !formData.subject || !formData.htmlTemplate) {
      setNotice({ type: 'error', text: t('allFieldsRequired') });
      return;
    }

    setLoading(true);
    try {
      const { data } = await API.post('/bulk-sender/campaign', formData);
      setCampaigns([...campaigns, data.campaign]);
      setFormData({ name: '', subject: '', htmlTemplate: '', region: '' });
      setOpenDialog(false);
      setNotice({ type: 'success', text: t('campaignCreatedSuccess') });
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, t('campaignCreatedError')) });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async (campaignId) => {
    setLoading(true);
    try {
      const { data } = await API.post(`/bulk-sender/campaign/${campaignId}/send`);
      setNotice({ type: 'success', text: t('campaignSentSuccess', { count: data.sentCount }) });
      fetchCampaigns();
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
    try {
      const { data } = await API.get(`/bulk-sender/campaign/${campaignId}/stats`);
      setSelectedCampaign(data);
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, t('statsLoadError')) });
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
      <Paper sx={{ overflowX: 'auto' }}>
        {campaigns.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f3f4f6' }}>
                <TableCell>{t('campaignNameHeader')}</TableCell>
                <TableCell>{t('regionHeader2')}</TableCell>
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
                  <TableCell>{campaign.region || 'All'}</TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{
                      px: 1.5,
                      py: 0.5,
                      backgroundColor: campaign.status === 'completed' ? '#d1fae5' : '#fef3c7',
                      color: campaign.status === 'completed' ? '#065f46' : '#92400e',
                      borderRadius: '4px'
                    }}>
                      {campaign.status}
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

      {/* Create Campaign Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
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
            <FormControl fullWidth>
              <InputLabel>{t('targetRegionLabel')}</InputLabel>
              <Select
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                label={t('targetRegionLabel')}
              >
                <MenuItem value="">{t('allRegions')}</MenuItem>
                {regions.map((region) => (
                  <MenuItem key={region} value={region}>{region}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t('htmlTemplateLabel')}
              value={formData.htmlTemplate}
              onChange={(e) => setFormData({ ...formData, htmlTemplate: e.target.value })}
              multiline
              rows={6}
              fullWidth
              helperText={t('htmlTemplateHelper')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>{t('cancelBtn')}</Button>
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
        <Dialog open={!!selectedCampaign} onClose={() => setSelectedCampaign(null)} maxWidth="sm" fullWidth>
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
