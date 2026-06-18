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
  Pagination,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  ContactRound,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  UsersRound
} from 'lucide-react';
import API, { getApiErrorMessage } from '../services/api';
import { useLanguage } from '../i18n.jsx';
import {
  clearLocalContacts,
  getContactDisplayName,
  removeLocalContact,
} from '../utils/localContacts';

const PAGE_SIZE = 100;

export default function ContactsManager() {
  const { t } = useLanguage();
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [contactDialog, setContactDialog] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [form, setForm] = useState({ name: '', email: '' });
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const statusLabel = (status = 'active') => {
    const labels = {
      active: t('statusActive'),
      pending: t('statusPending'),
      sent: t('statusSent'),
      failed: t('statusFailed')
    };
    return labels[status] || status;
  };

  const load = async () => {
    try {
      const { data } = await API.get('/contacts', {
        params: { search, page, limit: PAGE_SIZE }
      });
      localStorage.removeItem('mailoraParsedRecipients');
      setContacts(data.contacts || []);
      setTotal(data.total || 0);
      setPages(Math.max(data.pages || 1, 1));
    } catch (error) {
      setContacts([]);
      setTotal(0);
      setPages(1);
      setNotice({ type: 'error', text: getApiErrorMessage(error, t('contactsLoadError')) });
    }
  };

  useEffect(() => {
    const timeout = setTimeout(load, 80);
    const handleContactsUpdate = () => {
      load();
    };
    window.addEventListener('mailora:contacts-updated', handleContactsUpdate);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mailora:contacts-updated', handleContactsUpdate);
    };
  }, [search, page]);

  useEffect(() => {
    setPage(1);
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
      setNotice({ type: 'error', text: getApiErrorMessage(error, t('contactAddError')) });
    } finally {
      setLoading(false);
    }
  };

  const importCSV = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setNotice({ type: 'error', text: t('csvTooLarge') });
      event.target.value = '';
      return;
    }
    setLoading(true);
    try {
      const csvData = await file.text();
      const lines = csvData.split(/\r?\n/).filter(line => line.trim());
      const headers = lines.shift()?.split(',').map(value => value.trim().toLowerCase()) || [];
      const emailIndex = headers.indexOf('email');
      const nameIndex = headers.indexOf('name');
      const importedContacts = lines.map(line => {
        const values = line.split(',').map(value => value.trim());
        return { email: values[emailIndex], name: nameIndex >= 0 ? values[nameIndex] : '' };
      }).filter(contact => contact.email);
      await API.post('/contacts/import', { csvData });
      setNotice({ type: 'success', text: t('imported', { imported: importedContacts.length, total: importedContacts.length }) });
      load();
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, t('csvImportFailed')) });
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const remove = async (id) => {
    if (!window.confirm(t('contactDeleteConfirm'))) return;
    setLoading(true);
    try {
      removeLocalContact(id);
      await API.delete(`/contacts/${id}`);
      setContacts((current) => current.filter((contact) => contact.id !== id));
      setNotice({ type: 'success', text: t('contactDeleted') });
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, t('contactDeleteError')) });
    } finally {
      setLoading(false);
    }
  };

  const editContact = () => {
    if (!editingContact?.name.trim()) return;
    setLoading(true);
    API.patch(`/contacts/${editingContact.id}`, { name: editingContact.name.trim() })
      .then(() => {
        setEditingContact(null);
        setNotice({ type: 'success', text: t('contactUpdated') });
        load();
      })
      .catch((error) => {
        setNotice({ type: 'error', text: getApiErrorMessage(error, t('contactUpdateError')) });
      })
      .finally(() => setLoading(false));
  };

  const deleteAllContacts = async () => {
    if (!window.confirm(t('deleteAllContactsConfirm', { count: total }))) return;
    setLoading(true);
    try {
      const { data } = await API.delete('/contacts');
      clearLocalContacts();
      setContacts([]);
      setTotal(0);
      setPages(1);
      setPage(1);
      setSearch('');
      setNotice({
        type: 'success',
        text: t('contactsDeleted', { count: data.deleted || total })
      });
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, t('contactsDeleteError')) });
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
          <Button
            variant="outlined"
            color="error"
            startIcon={<Trash2 size={18} />}
            disabled={loading || total === 0}
            onClick={deleteAllContacts}
          >
            {t('deleteAll')}
          </Button>
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
            <Typography variant="body2" color="text.secondary">{t('addressesAvailable', { count: total })}</Typography>
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
                  <Avatar>{getContactDisplayName(contact)[0].toUpperCase()}</Avatar>
                  <Box className="contact-identity-copy">
                    <Typography className="contact-name" fontWeight={700}>{getContactDisplayName(contact)}</Typography>
                    <Typography className="contact-email" variant="body2" color="text.secondary">{contact.email}</Typography>
                  </Box>
                </Box>
                <Chip label={statusLabel(contact.status)} size="small" className="status-active" />
                <Stack className="contact-actions" direction="row" spacing={0.5}>
                  <IconButton
                    aria-label={`Edit ${contact.email}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingContact({ ...contact, name: getContactDisplayName(contact) });
                    }}
                  >
                    <Pencil size={17} />
                  </IconButton>
                  <IconButton disabled={loading} aria-label={`Delete ${contact.email}`} onClick={(event) => { event.stopPropagation(); remove(contact.id); }}><Trash2 size={17} /></IconButton>
                </Stack>
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
        {pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Pagination count={pages} page={page} onChange={(_, value) => setPage(value)} color="primary" />
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

      <Dialog className="responsive-dialog" open={Boolean(editingContact)} onClose={() => setEditingContact(null)} maxWidth="xs" fullWidth>
        <DialogTitle><Typography variant="h5">{t('contactEditTitle')}</Typography></DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          <TextField
            label={t('contactNameLabel')}
            autoFocus
            value={editingContact?.name || ''}
            onChange={(event) => setEditingContact(current => ({ ...current, name: event.target.value }))}
          />
          <TextField label={t('emailAddress')} value={editingContact?.email || ''} disabled />
        </DialogContent>
        <DialogActions className="responsive-dialog-actions" sx={{ p: 3 }}>
          <Button onClick={() => setEditingContact(null)}>{t('cancel')}</Button>
          <Button variant="contained" disabled={!editingContact?.name.trim()} onClick={editContact}>{t('saveSettings')}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(notice)} autoHideDuration={4500} onClose={() => setNotice(null)}>
        {notice && <Alert severity={notice.type} onClose={() => setNotice(null)}>{notice.text}</Alert>}
      </Snackbar>
    </>
  );
}
