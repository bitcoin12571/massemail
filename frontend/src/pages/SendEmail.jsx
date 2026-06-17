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
import { addLocalSendHistory } from '../utils/localHistory';
import { getContactDisplayName, mergeContacts } from '../utils/localContacts';

export default function SendEmail({ onOpenSettings }) {
  const { language, t } = useLanguage();
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [selectedContactSnapshots, setSelectedContactSnapshots] = useState({});
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
        const query = search.trim().toLowerCase();
        setContacts(mergeContacts(data.contacts).filter(contact =>
          !query || contact.email.includes(query) || contact.name.toLowerCase().includes(query)
        ));
      } catch {
        const query = search.trim().toLowerCase();
        setContacts(mergeContacts().filter(contact =>
          !query || contact.email.includes(query) || contact.name.toLowerCase().includes(query)
        ));
      }
    }, 200);
    const handleContactsUpdate = () => {
      const query = search.trim().toLowerCase();
      setContacts(mergeContacts().filter(contact =>
        !query || contact.email.includes(query) || contact.name.toLowerCase().includes(query)
      ));
    };
    window.addEventListener('mailora:contacts-updated', handleContactsUpdate);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mailora:contacts-updated', handleContactsUpdate);
    };
  }, [search]);

  const allSelected = contacts.length > 0 && contacts.every((contact) => selected.includes(contact.id));
  const selectedContacts = useMemo(
    () => selected
      .map((id) => selectedContactSnapshots[id] || contacts.find((contact) => contact.id === id))
      .filter(Boolean),
    [contacts, selected, selectedContactSnapshots]
  );

  useEffect(() => {
    setSelectedContactSnapshots((current) => {
      const next = { ...current };
      contacts.forEach((contact) => {
        if (selected.includes(contact.id)) next[contact.id] = contact;
      });
      return next;
    });
  }, [contacts, selected]);

  const toggle = (contact) => {
    setSelected((current) => {
      const isSelected = current.includes(contact.id);
      if (isSelected) {
        setSelectedContactSnapshots((snapshots) => {
          const next = { ...snapshots };
          delete next[contact.id];
          return next;
        });
        return current.filter((contactId) => contactId !== contact.id);
      }

      setSelectedContactSnapshots((snapshots) => ({ ...snapshots, [contact.id]: contact }));
      return [...current, contact.id];
    });
  };

  const toggleAllVisible = () => {
    if (allSelected) {
      const visibleIds = new Set(contacts.map((contact) => contact.id));
      setSelected((current) => current.filter((id) => !visibleIds.has(id)));
      setSelectedContactSnapshots((current) => {
        const next = { ...current };
        contacts.forEach((contact) => delete next[contact.id]);
        return next;
      });
      return;
    }

    setSelected((current) => [...new Set([...current, ...contacts.map((contact) => contact.id)])]);
    setSelectedContactSnapshots((current) => ({
      ...current,
      ...Object.fromEntries(contacts.map((contact) => [contact.id, contact]))
    }));
  };

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

  const getRecipientDisplayName = (contact) => (
    String(contact?.company || contact?.name || contact?.email || '').trim()
  );

  const buildRecipientHistoryName = (contacts = []) => {
    const names = contacts.map(getRecipientDisplayName).filter(Boolean);
    if (!names.length) return subject || 'Direct email';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]}, ${names[1]}`;
    return `${names[0]}, ${names[1]} + încă ${names.length - 2}`;
  };

  const send = async () => {
    if (selectedContacts.length !== selected.length) {
      setNotice({ type: 'error', text: 'Lista de destinatari nu este încă sincronizată. Reîncearcă peste o secundă.' });
      return;
    }

    setSending(true);
    try {
      const data = new FormData();
      data.append('contactIds', JSON.stringify(selectedContacts.map(({ id }) => id)));
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
        failedCount: response.data.failedCount || 0,
        subject: subject,
        filesCount: files.length,
        campaignId: response.data.campaignId
      });

      // Create individual recipient records with status and timestamp
      const recipientsWithStatus = selectedContacts.map(contact => ({
        email: contact.email,
        name: contact.name || contact.email,
        status: response.data.successfulRecipients?.includes(contact.id) ? 'sent' : 'failed',
        sentAt: new Date().toISOString()
      }));

      addLocalSendHistory({
        id: response.data.campaignId || `direct-${Date.now()}`,
        source: 'direct',
        name: response.data.campaignName || buildRecipientHistoryName(selectedContacts),
        subject,
        totalRecipients: response.data.recipientCount,
        sentCount: response.data.sentCount,
        failedCount: response.data.failedCount || Math.max(0, response.data.recipientCount - response.data.sentCount),
        recipients: recipientsWithStatus
      });
      setResultOpen(true);

      // Clear form
      setSelected([]);
      setSelectedContactSnapshots({});
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
              onChange={toggleAllVisible}
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
              <Box className={`recipient-option ${selected.includes(contact.id) ? 'selected' : ''}`} key={contact.id} onClick={() => toggle(contact)}>
                <Checkbox checked={selected.includes(contact.id)} onClick={(event) => event.stopPropagation()} onChange={() => toggle(contact)} />
                <Avatar>{getContactDisplayName(contact)[0].toUpperCase()}</Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700} noWrap>{getContactDisplayName(contact)}</Typography>
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
      <Dialog className="responsive-dialog send-result-dialog" open={resultOpen} onClose={() => setResultOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <CheckCircle size={24} style={{ color: '#10b981' }} />
          <Typography variant="h6">{t('sendSuccessTitle') || 'Emails sent successfully'}</Typography>
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
                <Typography variant="body2">{t('sendSuccessQueued') || 'Emails queued for delivery'}</Typography>
              </Box>

              <Box sx={{ p: 1.5, background: '#f3f4f6', borderRadius: 1, minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">{t('subject')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, overflowWrap: 'anywhere' }}>
                  {sendResult.subject || '(No subject)'}
                </Typography>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                <Box sx={{ p: 1.5, background: '#f3f4f6', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">{t('attachments')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                    {sendResult.filesCount} {sendResult.filesCount === 1 ? 'file' : 'files'}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, background: '#f3f4f6', borderRadius: 1, minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">Campaign ID</Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, mt: 0.5, fontFamily: 'monospace', overflowWrap: 'anywhere' }}
                  >
                    {sendResult.campaignId}
                  </Typography>
                </Box>
              </Box>

              {/* Info */}
              <Alert severity="info" sx={{ border: 'none', background: '#cffafe', color: '#164e63' }}>
                <Typography variant="body2">
                  {t('sendSuccessHelp') || 'Emails will be delivered within the next few minutes. Check the Delivery Status page to monitor progress.'}
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
                  {t('done') || 'Done'}
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
