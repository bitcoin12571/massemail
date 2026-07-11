import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  InputAdornment,
  LinearProgress,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Typography
} from '@mui/material';
import { CheckCircle, Eye, File, Image, Paperclip, Search, Send, Sparkles, UsersRound, X, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import API, { getApiErrorMessage } from '../services/api';
import { useLanguage } from '../i18n.jsx';
import { EmailPreviewModalCompose } from '../components/EmailPreviewModalCompose.jsx';
import { getContactDisplayName } from '../utils/localContacts';
import { createFileInput } from '../utils/filePickerMemory';

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

  // Auto-send state
  const [sendMode, setSendMode] = useState('manual'); // 'manual', 'auto', or 'schedule'
  const [totalContacts, setTotalContacts] = useState(0);
  const [autoSendState, setAutoSendState] = useState({ currentBatch: 0, sentCount: 0, totalBatches: 0 });
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [scheduleStarted, setScheduleStarted] = useState(false);
  const [scheduleDays, setScheduleDays] = useState(10);
  const BATCH_SIZE = 100;
  const DAILY_LIMIT = 200;

  useEffect(() => {
    API.get('/settings/email')
      .then(({ data }) => setDeliveryMode(data.provider))
      .catch(() => setDeliveryMode('preview'));
  }, []);

  // Load total contacts when auto mode is enabled
  useEffect(() => {
    if (sendMode === 'auto') {
      setIsLoadingContacts(true);
      API.get('/contacts', { params: { limit: 1 } })
        .then(({ data }) => {
          setTotalContacts(data.total || 0);
          const batches = Math.ceil((data.total || 0) / BATCH_SIZE);
          setAutoSendState(prev => ({
            ...prev,
            totalBatches: batches
          }));
        })
        .catch(error => {
          console.error('Failed to load contacts:', error);
          setNotice({ type: 'error', text: 'Failed to load contacts' });
        })
        .finally(() => setIsLoadingContacts(false));
    }
  }, [sendMode]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const { data } = await API.get('/contacts', { params: { search, limit: 5000 } });
        const query = search.trim().toLowerCase();
        setContacts((data.contacts || []).filter(contact =>
          !query || contact.email.includes(query) || String(contact.name || '').toLowerCase().includes(query)
        ));
      } catch (error) {
        setContacts([]);
        setNotice({ type: 'error', text: getApiErrorMessage(error, t('loadRecipientsError')) });
      }
    }, 200);
    const handleContactsUpdate = () => {
      API.get('/contacts', { params: { search, limit: 5000 } })
        .then(({ data }) => setContacts(data.contacts || []))
        .catch(() => setContacts([]));
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

  const addFiles = (incoming) => {
    const incomingFiles = Array.isArray(incoming) ? incoming : Array.from(incoming || []);
    const combined = [...files, ...incomingFiles].slice(0, 5);
    if (combined.some((file) => file.size > 10 * 1024 * 1024)) {
      setNotice({ type: 'error', text: t('fileTooLarge') });
      return;
    }
    setFiles(combined);
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

      // Update batch progress
      const batchInfo = localStorage.getItem('mailioraBatchInfo');
      if (batchInfo) {
        const info = JSON.parse(batchInfo);
        const batchProgress = JSON.parse(localStorage.getItem('mailioraBatchProgress') || '{"sent": 0, "batchSize": 100}');
        batchProgress.sent = info.batchEnd;
        localStorage.setItem('mailioraBatchProgress', JSON.stringify(batchProgress));
        localStorage.removeItem('mailioraBatchInfo');
      }

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

      window.dispatchEvent(new Event('mailora:history-updated'));
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

  const sendAutoMode = async () => {
    setSending(true);
    try {
      const data = new FormData();
      // Send to ALL contacts - no need to select manually
      data.append('sendToAll', 'true');
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

      window.dispatchEvent(new Event('mailora:history-updated'));
      setResultOpen(true);

      // Clear form
      setSubject('');
      setMessage('');
      setFiles([]);
      setAutoSendState({ currentBatch: 0, sentCount: 0, totalBatches: 0 });
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, t('sendFailed')) });
    } finally {
      setSending(false);
    }
  };

  const startScheduling = async () => {
    if (!subject.trim() || !message.trim()) {
      setNotice({ type: 'error', text: 'Please enter subject and message' });
      return;
    }

    setSending(true);
    try {
      const data = {
        subject: subject.trim(),
        message: message.trim(),
        dailyLimit: DAILY_LIMIT,
        totalContacts: totalContacts
      };

      const response = await API.post('/contacts/schedule-campaign', data);

      setSendResult({
        success: true,
        campaignId: response.data.campaignId,
        scheduledDays: Math.ceil(totalContacts / DAILY_LIMIT),
        totalContacts: totalContacts,
        dailyLimit: DAILY_LIMIT,
        subject: subject
      });

      setResultOpen(true);
      setScheduleStarted(true);

      // Clear form
      setSubject('');
      setMessage('');
      setFiles([]);
      window.dispatchEvent(new Event('mailora:history-updated'));
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, 'Failed to schedule campaign') });
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
        <Stack direction="row" spacing={1}>
          <Button
            variant={sendMode === 'manual' ? 'contained' : 'outlined'}
            startIcon={<Send size={18} />}
            onClick={() => setSendMode('manual')}
          >
            📧 Manual Send
          </Button>
          <Button
            variant={sendMode === 'auto' ? 'contained' : 'outlined'}
            startIcon={<Zap size={18} />}
            onClick={() => setSendMode('auto')}
          >
            ⚡ Auto-Send
          </Button>
          <Button
            variant={sendMode === 'schedule' ? 'contained' : 'outlined'}
            startIcon={<motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>📅</motion.div>}
            onClick={() => setSendMode('schedule')}
          >
            📅 Schedule 200/day
          </Button>
        </Stack>
      </Box>

      {sendMode === 'auto' ? (
        /* AUTO-SEND MODE */
        <Paper sx={{ p: 3 }}>
          <Stack spacing={3}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Box>
                <Typography variant="h5" sx={{ mb: 1 }}>
                  ⚡ Auto-Send to All {totalContacts} Contacts
                </Typography>
                <Typography color="text.secondary">
                  Automatically send emails in batches of {BATCH_SIZE}
                </Typography>
              </Box>
            </motion.div>

            {totalContacts > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2">
                      📊 Progress: {autoSendState.sentCount}/{totalContacts}
                    </Typography>
                    <Typography variant="subtitle2">
                      {autoSendState.totalBatches > 0
                        ? `${Math.round((autoSendState.sentCount / totalContacts) * 100)}% (${autoSendState.currentBatch}/${autoSendState.totalBatches} batches)`
                        : 'Loading...'}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={totalContacts > 0 ? (autoSendState.sentCount / totalContacts) * 100 : 0}
                    sx={{ height: 10, borderRadius: 1 }}
                  />
                </Box>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <TextField
                fullWidth
                label="Email Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending}
                multiline
                rows={2}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <TextField
                fullWidth
                label="Email Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending}
                multiline
                rows={10}
                placeholder="Write your message here..."
              />
            </motion.div>

            {/* Attachments */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>📎 Attachments</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  startIcon={<Image size={20} />}
                  onClick={() => createFileInput({
                    accept: 'image/*',
                    onFile: (selectedFiles) => {
                      if (selectedFiles[0]) {
                        addFiles([selectedFiles[0]]);
                      }
                    }
                  })}
                  disabled={sending}
                  sx={{ minWidth: 150 }}
                >
                  📷 Add Photo
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  startIcon={<Paperclip size={20} />}
                  onClick={() => createFileInput({
                    accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt',
                    onFile: (selectedFiles) => {
                      if (selectedFiles[0]) {
                        addFiles([selectedFiles[0]]);
                      }
                    }
                  })}
                  disabled={sending}
                  sx={{ minWidth: 150 }}
                >
                  📎 Add File
                </Button>
              </Box>

              {/* Show attached files */}
              {files.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    📁 Attached Files ({files.length}):
                  </Typography>
                  <Stack spacing={1}>
                    {files.map((file, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1,
                          bgcolor: '#f3f4f6',
                          borderRadius: 1
                        }}
                      >
                        <Typography variant="body2">
                          {file.name} ({(file.size / 1024).toFixed(2)} KB)
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => setFiles(current => current.filter((_, i) => i !== index))}
                          startIcon={<X size={16} />}
                        >
                          Remove
                        </Button>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={sending ? <CircularProgress size={20} /> : <Send size={20} />}
                  onClick={sendAutoMode}
                  disabled={sending || totalContacts === 0 || !subject.trim() || !message.trim()}
                  sx={{ flex: 1 }}
                >
                  {sending ? 'Sending...' : `Start Auto-Send to All ${totalContacts}`}
                </Button>
              </Stack>
            </motion.div>
          </Stack>
        </Paper>
      ) : sendMode === 'schedule' ? (
        /* SCHEDULE MODE */
        <Paper sx={{ p: 3 }}>
          <Stack spacing={3}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Box>
                <Typography variant="h5" sx={{ mb: 1 }}>
                  📅 Schedule Campaign - 200/day
                </Typography>
                <Typography color="text.secondary">
                  Send {totalContacts} emails automatically over {scheduleDays} days
                </Typography>
              </Box>
            </motion.div>

            {totalContacts > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Box sx={{
                  p: 2,
                  bgcolor: '#f0f4ff',
                  borderRadius: 1,
                  border: '1px solid #e0e7ff'
                }}>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Total contacts:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{totalContacts}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Per day:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{DAILY_LIMIT}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Duration:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{Math.ceil(totalContacts / DAILY_LIMIT)} days</Typography>
                    </Box>
                  </Stack>
                </Box>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <TextField
                fullWidth
                label="Email Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending}
                multiline
                rows={2}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <TextField
                fullWidth
                label="Email Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending}
                multiline
                rows={10}
                placeholder="Write your message here..."
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={sending ? <CircularProgress size={20} /> : <Send size={20} />}
                  onClick={startScheduling}
                  disabled={sending || totalContacts === 0 || !subject.trim() || !message.trim()}
                  sx={{ flex: 1 }}
                >
                  {sending ? 'Scheduling...' : `Start Scheduling`}
                </Button>
              </Stack>
            </motion.div>
          </Stack>
        </Paper>
      ) : (
        /* MANUAL MODE */
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
                <Button
                  variant="outlined"
                  startIcon={<Image size={17} />}
                  onClick={() => {
                    createFileInput({
                      accept: 'image/*',
                      multiple: true,
                      onFile: addFiles
                    });
                  }}
                >
                  {t('addPhoto')}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Paperclip size={17} />}
                  onClick={() => {
                    createFileInput({
                      accept: '',
                      multiple: true,
                      onFile: addFiles
                    });
                  }}
                >
                  {t('addFile')}
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
      )}

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
                    {sendResult.filesCount} {sendResult.filesCount === 1 ? t('attachedFileSingular') : t('attachedFilePlural')}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, background: '#f3f4f6', borderRadius: 1, minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">{t('campaignCode')}</Typography>
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
