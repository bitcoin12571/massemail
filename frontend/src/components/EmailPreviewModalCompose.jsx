import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { Eye, X } from 'lucide-react';
import { useLanguage } from '../i18n.jsx';

export function EmailPreviewModalCompose({ open, onClose, subject, htmlContent, selectedContacts }) {
  const { t } = useLanguage();
  const [selectedContactId, setSelectedContactId] = useState(null);

  const selectedContact = useMemo(() => {
    return selectedContacts.find(c => c.id === selectedContactId) || selectedContacts[0];
  }, [selectedContactId, selectedContacts]);

  const personalizeContent = (template, contact) => {
    if (!template) return '';
    let content = template;
    content = content.replace(/{{firstName}}/g, contact.firstName || '');
    content = content.replace(/{{lastName}}/g, contact.lastName || '');
    content = content.replace(/{{email}}/g, contact.email || '');
    if (contact.customData) {
      Object.entries(contact.customData).forEach(([key, value]) => {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
      });
    }
    return content;
  };

  const personalizedSubject = selectedContact ? personalizeContent(subject, selectedContact) : subject;
  const personalizedHtml = selectedContact ? personalizeContent(htmlContent, selectedContact) : htmlContent;

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
        {selectedContacts.length > 1 && (
          <FormControl fullWidth size="small">
            <InputLabel>{t('selectContact') || 'Select Contact'}</InputLabel>
            <Select
              value={selectedContactId || (selectedContacts[0]?.id || '')}
              label={t('selectContact') || 'Select Contact'}
              onChange={(e) => setSelectedContactId(e.target.value)}
            >
              {selectedContacts.map((contact) => (
                <MenuItem key={contact.id} value={contact.id}>
                  {contact.name && `${contact.name} (${contact.email})`}
                  {!contact.name && contact.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {selectedContact && (
          <>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                {t('recipient') || 'Recipient'}
              </Typography>
              <Typography variant="body2">
                {selectedContact.name && `${selectedContact.name} <${selectedContact.email}>`}
                {!selectedContact.name && selectedContact.email}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                {t('subject') || 'Subject'}
              </Typography>
              <Typography
                variant="body2"
                sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, wordBreak: 'break-word' }}
              >
                {personalizedSubject}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                {t('emailContent') || 'Email Content'}
              </Typography>
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2,
                  bgcolor: 'background.paper',
                  minHeight: 300,
                  maxHeight: 500,
                  overflow: 'auto',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  '& img': {
                    maxWidth: '100%',
                    height: 'auto'
                  }
                }}
                dangerouslySetInnerHTML={{ __html: personalizedHtml }}
              />
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} startIcon={<X size={18} />}>
          {t('close') || 'Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
