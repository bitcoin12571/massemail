import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { Eye, X } from 'lucide-react';
import API, { getApiErrorMessage } from '../services/api';
import { useLanguage } from '../i18n.jsx';

export function EmailPreviewModal({ open, onClose, campaignId, selectedContacts }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [error, setError] = useState(null);

  const handleLoadPreview = async (contactId) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.post(`/campaigns/${campaignId}/preview`, {
        contactId
      });
      setPreview(data);
      setSelectedContact(contactId);
    } catch (err) {
      setError(getApiErrorMessage(err, t('previewFailed') || 'Failed to load preview'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPreview(null);
    setSelectedContact(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { backgroundImage: 'none' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Eye size={20} />
        {t('emailPreview') || 'Email Preview'}
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        {!selectedContact && selectedContacts.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              {t('selectContactToPreview') || 'Select a contact to preview:'}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {selectedContacts.slice(0, 5).map((contact) => (
                <Button
                  key={contact.id}
                  variant="outlined"
                  onClick={() => handleLoadPreview(contact.id)}
                  sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  disabled={loading}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {contact.name || contact.email}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {contact.email}
                    </Typography>
                  </Box>
                </Button>
              ))}
              {selectedContacts.length > 5 && (
                <Typography variant="caption" color="text.secondary">
                  {t('andMore', { count: selectedContacts.length - 5 }) || `and ${selectedContacts.length - 5} more...`}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {preview && !loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                {t('recipient') || 'Recipient'}
              </Typography>
              <Typography variant="body2">
                {preview.contact.name && `${preview.contact.name} <${preview.contact.email}>`}
                {!preview.contact.name && preview.contact.email}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                {t('subject') || 'Subject'}
              </Typography>
              <Typography variant="body2" sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                {preview.subject}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                {t('emailContent') || 'Email Content'}
              </Typography>
              <Box
                component="iframe"
                title={t('emailPreview') || 'Email Preview'}
                sandbox=""
                srcDoc={preview.htmlContent}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  width: '100%',
                  minHeight: 360,
                  bgcolor: 'background.paper'
                }}
              />
            </Box>

            <Button
              variant="outlined"
              onClick={() => {
                setPreview(null);
                setSelectedContact(null);
              }}
              fullWidth
            >
              {t('selectAnotherContact') || 'Select Another Contact'}
            </Button>
          </Box>
        )}

        {!preview && !loading && selectedContacts.length === 0 && (
          <Alert severity="info">
            {t('noContactsSelected') || 'Please select at least one contact to preview'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} startIcon={<X size={18} />}>
          {t('close') || 'Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
