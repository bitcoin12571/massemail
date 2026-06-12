import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  ContactRound,
  Plus,
  Search,
  Trash2,
  Upload,
  UsersRound
} from 'lucide-react';
import API, { getApiErrorMessage } from '../services/api';
import { useLanguage } from '../i18n.jsx';

export default function ContactsManager() {
  const { t } = useLanguage();
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [contactDialog, setContactDialog] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const { data } = await API.get('/contacts', { params: { search, limit: 500 } });
      setContacts(data.contacts);
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, 'Could not load the email database') });
    }
  };

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const addContact = async () => {
    setLoading(true);
    try {
      await API.post('/contacts', form);
      setForm({ name: '', email: '' });
      setContactDialog(false);
      setNotice({ type: 'success', text: t('emailAdded') });
      load();
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, 'Could not add this email') });
    } finally {
      setLoading(false);
    }
  };

  const importCSV = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'CSV file must be 5 MB or smaller' });
      event.target.value = '';
      return;
    }
    setLoading(true);
    try {
      const csvData = await file.text();
      const { data } = await API.post('/contacts/import', { csvData });
      setNotice({ type: 'success', text: t('imported', { imported: data.imported, total: data.total }) });
      load();
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, 'CSV import failed') });
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    setLoading(true);
    try {
      await API.delete(`/contacts/${id}`);
      setContacts((current) => current.filter((contact) => contact.id !== id));
      setNotice({ type: 'success', text: 'Contact deleted' });
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, 'Could not delete this contact') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box className="page-heading">
        <Box>
          <Typography className="eyebrow">{t('databaseEyebrow')}</Typography>
          <Typography variant="h3">{t('databaseTitle')}</Typography>
          <Typography color="text.secondary">{t('importHelp')}</Typography>
        </Box>
        <Stack direction="row" spacing={1.25}>
          <Button component="label" variant="outlined" startIcon={<Upload size={18} />} disabled={loading}>
            {t('importCsv')}<input hidden type="file" accept=".csv,text/csv" onChange={importCSV} />
          </Button>
          <Button variant="contained" startIcon={<Plus size={18} />} disabled={loading} onClick={() => setContactDialog(true)}>{t('addEmail')}</Button>
        </Stack>
      </Box>

      <Paper className="contacts-panel email-database">
        <Box className="contacts-toolbar">
          <Box>
            <Typography variant="h6">{t('companyRecipients')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('addressesAvailable', { count: contacts.length })}</Typography>
          </Box>
          <TextField
            size="small"
            placeholder={t('searchRecipient')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={17} /></InputAdornment> }}
          />
        </Box>

        {contacts.length ? (
          <Box className="contact-table">
            <Box className="contact-table-head">
              <span>{t('recipient')}</span><span>{t('status')}</span><span />
            </Box>
            {contacts.map((contact) => (
              <Box
                className="contact-row"
                key={contact.id}
              >
                <Box className="contact-identity">
                  <Avatar>{(contact.name || contact.email)[0].toUpperCase()}</Avatar>
                  <Box><Typography fontWeight={700}>{contact.name || 'Unnamed recipient'}</Typography><Typography variant="body2" color="text.secondary">{contact.email}</Typography></Box>
                </Box>
                <Chip label={contact.status} size="small" className="status-active" />
                <IconButton disabled={loading} aria-label={`Delete ${contact.email}`} onClick={(event) => { event.stopPropagation(); remove(contact.id); }}><Trash2 size={17} /></IconButton>
              </Box>
            ))}
          </Box>
        ) : (
          <Box className="empty-state contacts-empty">
            <Box className="empty-round"><UsersRound size={30} /></Box>
            <Typography variant="h5">{t('importTitle')}</Typography>
            <Typography color="text.secondary">{t('importHelp')}</Typography>
            <Stack direction="row" spacing={1}>
              <Button component="label" variant="contained" startIcon={<Upload size={18} />}>{t('importCsv')}<input hidden type="file" accept=".csv,text/csv" onChange={importCSV} /></Button>
              <Button variant="outlined" startIcon={<ContactRound size={18} />} onClick={() => setContactDialog(true)}>{t('addEmail')}</Button>
            </Stack>
          </Box>
        )}
      </Paper>

      <Dialog open={contactDialog} onClose={() => setContactDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle><Typography variant="h5">{t('addDatabaseTitle')}</Typography></DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          <TextField label={t('fullName')} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <TextField label={t('emailAddress')} type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}><Button disabled={loading} onClick={() => setContactDialog(false)}>{t('cancel')}</Button><Button variant="contained" disabled={loading || !form.email} onClick={addContact}>{t('addDatabase')}</Button></DialogActions>
      </Dialog>

      <Snackbar open={Boolean(notice)} autoHideDuration={4500} onClose={() => setNotice(null)}>
        {notice && <Alert severity={notice.type} onClose={() => setNotice(null)}>{notice.text}</Alert>}
      </Snackbar>
    </>
  );
}
