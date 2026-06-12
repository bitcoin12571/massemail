import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  InputAdornment,
  LinearProgress,
  Paper,
  Snackbar,
  TextField,
  Typography
} from '@mui/material';
import { CheckCircle, Eye, File, Image, Paperclip, Search, Send, Sparkles, UsersRound, X } from 'lucide-react';
import API, { getApiErrorMessage } from '../services/api';
import { useLanguage } from '../i18n.jsx';
import { EmailPreviewModalCompose } from '../components/EmailPreviewModalCompose.jsx';

export default function SendEmail({ onOpenSettings }) {
  const { language, t } = useLanguage();
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [improving, setImproving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [deliveryMode, setDeliveryMode] = useState('preview');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [resultOpen, setResultOpen] = useState(false);

  useEffect(() => {
    API.get('/settings/email')
      .then(({ data }) => setDeliveryMode(data.provider))
      .catch(() => setDeliveryMode('preview'));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const { data } = await API.get('/contacts', { params: { search, limit: 500 } });
        setContacts(data.contacts);
      } catch {
        setNotice({ type: 'error', text: t('loadRecipientsError') });
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [search]);

  const allSelected = contacts.length > 0 && contacts.every((contact) => selected.includes(contact.id));
  const selectedContacts = useMemo(
    () => contacts.filter((contact) => selected.includes(contact.id)),
    [contacts, selected]
  );

  const toggle = (id) => setSelected((current) => current.includes(id)
    ? current.filter((contactId) => contactId !== id)
    : [...current, id]);

  const addFiles = (event) => {
    const incoming = Array.from(event.target.files || []);
    const combined = [...files, ...incoming].slice(0, 5);
    if (combined.some((file) => file.size > 10 * 1024 * 1024)) {
      setNotice({ type: 'error', text: t('fileTooLarge') });
      return;
    }
    setFiles(combined);
    event.target.value = '';
  };

  const improveWithAI = async () => {
    setImproving(true);
    try {
      const { data } = await API.post('/ai/rewrite', { subject, message, language });
      setSubject(data.subject);
      setMessage(data.message);
      setNotice({ type: 'success', text: t('aiImproveSuccess') });
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, t('aiImproveFailed')) });
    } finally {
      setImproving(false);
    }
  };

  const send = async () => {
    setSending(true);
    try {
      const data = new FormData();
      data.append('contactIds', JSON.stringify(selected));
      data.append('recipients', JSON.stringify(selectedContacts.map(({ id, email, name, status }) => ({
        id,
        email,
        name,
        status
      }))));
      data.append('subject', subject);
      data.append('message', message);
      files.forEach((file) => data.append('attachments', file));
      const response = await API.post('/contacts/send-now', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Show success result
      setSendResult({
        success: true,
        sentCount: response.data.sentCount,
        recipientCount: response.data.recipientCount,
        subject: subject,
        filesCount: files.length,
        campaignId: response.data.campaignId
      });
      setResultOpen(true);

      // Clear form
      setSelected([]);
      setSubject('');
      setMessage('');
      setFiles([]);
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, t('sendFailed')) });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Box className="page-heading">
        <Box>
          <Typography className="eyebrow">{t('sendNow')}</Typography>
          <Typography variant="h3">{t('composeTitle')}</Typography>
          <Typography color="text.secondary">{t('composeSubtitle')}</Typography>
        </Box>
      </Box>

      <Box className="send-composer-grid">
        <Paper className="recipient-selector">
          <Box className="composer-panel-head">
            <Box>
              <Typography variant="h6">{t('chooseRecipients')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('selectedRecipients', { count: selected.length })}</Typography>
            </Box>
            <Checkbox
              checked={allSelected}
              indeterminate={selected.length > 0 && !allSelected}
              onChange={() => setSelected(allSelected ? [] : contacts.map((contact) => contact.id))}
            />
          </Box>
          <Box className="recipient-search">
            <TextField
              fullWidth
              size="small"
              placeholder={t('searchRecipient')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search size={17} /></InputAdornment> }}
            />
          </Box>
          <Box className="recipient-list">
            {contacts.length ? contacts.map((contact) => (
              <Box className={`recipient-option ${selected.includes(contact.id) ? 'selected' : ''}`} key={contact.id} onClick={() => toggle(contact.id)}>
                <Checkbox checked={selected.includes(contact.id)} onClick={(event) => event.stopPropagation()} onChange={() => toggle(contact.id)} />
                <Avatar>{(contact.name || contact.email)[0].toUpperCase()}</Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700} noWrap>{contact.name || contact.email}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>{contact.email}</Typography>
                </Box>
              </Box>
            )) : (
              <Box className="recipient-list-empty"><UsersRound size={28} /><Typography>{t('noRecipients')}</Typography></Box>
            )}
          </Box>
        </Paper>

        <Paper className="message-composer">
          <Box className="composer-panel-head">
            <Box>
              <Typography variant="h6">{t('writeMessage')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('individualNotice')}</Typography>
            </Box>
            <Chip color={selected.length ? 'primary' : 'default'} label={t('selectedRecipients', { count: selected.length })} />
          </Box>
          <Box className="composer-fields">
            {selectedContacts.length > 0 && (
              <Box className="selected-recipient-chips">
                {selectedContacts.slice(0, 5).map((contact) => <Chip key={contact.id} label={contact.email} size="small" />)}
                {selected.length > 5 && <Chip label={t('more', { count: selected.length - 5 })} size="small" />}
              </Box>
            )}
            <TextField label={t('subject')} value={subject} onChange={(event) => setSubject(event.target.value)} />
            <TextField
              label={t('message')}
              multiline
              minRows={10}
              placeholder={t('messagePlaceholder')}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <Box className="ai-rewrite-row">
              <Box>
                <Typography fontWeight={750}>{t('aiImproveTitle')}</Typography>
                <Typography variant="body2" color="text.secondary">{t('aiImproveHelp')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Eye size={17} />}
                  disabled={sending || !subject.trim() || !message.trim() || !selected.length}
                  onClick={() => setPreviewOpen(true)}
                >
                  {t('preview') || 'Preview'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Sparkles size={17} />}
                  disabled={improving || sending || !message.trim()}
                  onClick={improveWithAI}
                >
                  {improving ? t('aiImproving') : t('aiImprove')}
                </Button>
              </Box>
            </Box>
            <Box className="attachment-box">
              <Box>
                <Typography fontWeight={750}>{t('attachments')}</Typography>
                <Typography variant="body2" color="text.secondary">{t('attachmentsHelp')}</Typography>
              </Box>
              <Box className="attachment-buttons">
                <Button component="label" variant="outlined" startIcon={<Image size={17} />}>
                  {t('addPhoto')}
                  <input hidden multiple type="file" accept="image/*" onChange={addFiles} />
                </Button>
                <Button component="label" variant="outlined" startIcon={<Paperclip size={17} />}>
                  {t('addFile')}
                  <input hidden multiple type="file" onChange={addFiles} />
                </Button>
              </Box>
            </Box>
            {files.length > 0 && (
              <Box className="attached-files">
                {files.map((file, index) => (
                  <Box className="attached-file" key={`${file.name}-${index}`}>
                    <File size={17} />
                    <Typography variant="body2" noWrap>{file.name}</Typography>
                    <Button onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}><X size={15} /></Button>
                  </Box>
                ))}
              </Box>
            )}
            {(sending || improving) && <LinearProgress />}
            <Button
              className="composer-send-button"
              size="large"
              variant="contained"
              startIcon={<Send size={19} />}
              disabled={sending || !selected.length || !subject.trim() || !message.trim()}
              onClick={send}
            >
              {sending ? t('sending') : selected.length === 1 ? 'Trimite acum la 1 client' : t('sendToCount', { count: selected.length })}
            </Button>
          </Box>
        </Paper>
      </Box>

      <EmailPreviewModalCompose
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        subject={subject}
        htmlContent={`<div style="font-family:Arial,sans-serif;line-height:1.6">${message
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll('\n', '<br>')}</div>`}
        selectedContacts={selectedContacts}
      />

      <Snackbar open={Boolean(notice)} autoHideDuration={5000} onClose={() => setNotice(null)}>
        {notice && <Alert severity={notice.type} onClose={() => setNotice(null)}>{notice.text}</Alert>}
      </Snackbar>

      {/* Send Success Result Modal */}
      <Dialog open={resultOpen} onClose={() => setResultOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <CheckCircle size={24} style={{ color: '#10b981' }} />
          <Typography variant="h6">Emails Sent Successfully!</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {sendResult && (
            <Box sx={{ display: 'grid', gap: 2 }}>
              {/* Main Stats */}
              <Box sx={{
                p: 2,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                borderRadius: 1,
                textAlign: 'center'
              }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {sendResult.sentCount} / {sendResult.recipientCount}
                </Typography>
                <Typography variant="body2">Emails queued for delivery</Typography>
              </Box>

              {/* Details Grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Box sx={{ p: 1.5, background: '#f3f4f6', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">Subject</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }} noWrap>
                    {sendResult.subject || '(No subject)'}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, background: '#f3f4f6', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">Attachments</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                    {sendResult.filesCount} {sendResult.filesCount === 1 ? 'file' : 'files'}
                  </Typography>
                </Box>
              </Box>

              {/* Campaign ID */}
              <Box sx={{ p: 1.5, background: '#f3f4f6', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Campaign ID</Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, mt: 0.5, fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  {sendResult.campaignId}
                </Typography>
              </Box>

              {/* Info */}
              <Alert severity="info" sx={{ border: 'none', background: '#cffafe', color: '#164e63' }}>
                <Typography variant="body2">
                  Emails will be delivered within the next few minutes. Check the Delivery Status page to monitor progress.
                </Typography>
              </Alert>

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => setResultOpen(false)}
                  sx={{ background: '#7c3aed' }}
                >
                  Done
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
