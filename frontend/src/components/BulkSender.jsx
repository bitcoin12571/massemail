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
      setNotice({ type: 'error', text: 'All fields are required' });
      return;
    }

    setLoading(true);
    try {
      const { data } = await API.post('/bulk-sender/campaign', formData);
      setCampaigns([...campaigns, data.campaign]);
      setFormData({ name: '', subject: '', htmlTemplate: '', region: '' });
      setOpenDialog(false);
      setNotice({ type: 'success', text: 'Campaign created successfully!' });
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, 'Failed to create campaign') });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async (campaignId) => {
    setLoading(true);
    try {
      const { data } = await API.post(`/bulk-sender/campaign/${campaignId}/send`);
      setNotice({ type: 'success', text: `Campaign sent to ${data.sentCount} recipients!` });
      fetchCampaigns();
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, 'Failed to send campaign') });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;

    setLoading(true);
    try {
      await API.delete(`/bulk-sender/campaign/${campaignId}`);
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
      setNotice({ type: 'success', text: 'Campaign deleted' });
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, 'Failed to delete campaign') });
    } finally {
      setLoading(false);
    }
  };

  const handleViewStats = async (campaignId) => {
    try {
      const { data } = await API.get(`/bulk-sender/campaign/${campaignId}/stats`);
      setSelectedCampaign(data);
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, 'Failed to load stats') });
    }
  };

  return (
    <>
      <Box className="page-heading">
        <Box>
          <Typography className="eyebrow">BULK EMAIL</Typography>
          <Typography variant="h3">Campaign Manager</Typography>
          <Typography color="text.secondary">Create and send bulk email campaigns</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Send size={18} />}
          onClick={() => setOpenDialog(true)}
        >
          New Campaign
        </Button>
      </Box>

      {/* Campaigns List */}
      <Paper sx={{ overflowX: 'auto' }}>
        {campaigns.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f3f4f6' }}>
                <TableCell>Campaign Name</TableCell>
                <TableCell>Region</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Recipients</TableCell>
                <TableCell align="right">Sent</TableCell>
                <TableCell align="right">Failed</TableCell>
                <TableCell align="center">Actions</TableCell>
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
                        Stats
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
                          Send
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
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">No campaigns yet. Click "New Campaign" to get started.</Typography>
          </Box>
        )}
      </Paper>

      {/* Create Campaign Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Crează Campanie Nouă</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Nume Campanie"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Subiect Email"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Regiunea Țintă (Opțional)</InputLabel>
              <Select
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                label="Regiunea Țintă"
              >
                <MenuItem value="">Toate Regiunile</MenuItem>
                {regions.map((region) => (
                  <MenuItem key={region} value={region}>{region}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Template HTML Email"
              value={formData.htmlTemplate}
              onChange={(e) => setFormData({ ...formData, htmlTemplate: e.target.value })}
              multiline
              rows={6}
              fullWidth
              helperText="Folosește {{name}}, {{email}}, {{region}} pentru personalizare"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Anulează</Button>
          <Button
            variant="contained"
            onClick={handleCreateCampaign}
            disabled={loading}
          >
            Crează Campanie
          </Button>
        </DialogActions>
      </Dialog>

      {/* Campaign Stats Modal */}
      {selectedCampaign && (
        <Dialog open={!!selectedCampaign} onClose={() => setSelectedCampaign(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Campaign Statistics</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2">Campaign: {selectedCampaign.campaign.name}</Typography>
                <Typography variant="caption" color="text.secondary">Created: {new Date(selectedCampaign.campaign.createdAt).toLocaleDateString()}</Typography>
              </Box>

              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Total Recipients:</Typography>
                  <Typography variant="subtitle2">{selectedCampaign.campaign.totalRecipients}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Sent:</Typography>
                  <Typography variant="subtitle2">{selectedCampaign.campaign.sentCount}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Failed:</Typography>
                  <Typography variant="subtitle2">{selectedCampaign.campaign.failedCount}</Typography>
                </Box>
              </Stack>

              <Stack spacing={2}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption">Open Rate</Typography>
                    <Typography variant="caption">{selectedCampaign.openRate}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={parseFloat(selectedCampaign.openRate)} />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption">Click Rate</Typography>
                    <Typography variant="caption">{selectedCampaign.clickRate}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={parseFloat(selectedCampaign.clickRate)} />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption">Bounce Rate</Typography>
                    <Typography variant="caption">{selectedCampaign.bounceRate}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={parseFloat(selectedCampaign.bounceRate)} color="error" />
                </Box>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedCampaign(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}

      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice(null)}>
        {notice && <Alert severity={notice.type}>{notice.text}</Alert>}
      </Snackbar>
    </>
  );
}
