import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { BadgeCheck, Building2, Database, ExternalLink, Mail, MapPin, Phone, Search, Square } from 'lucide-react';
import API, { getApiErrorMessage } from '../services/api';
import { useLanguage } from '../i18n.jsx';
import { saveLocalContacts } from '../utils/localContacts';

const CATEGORIES = [
  { value: 'all', labelKey: 'parserCategoryAll' },
  { value: 'restaurant', labelKey: 'parserCategoryRestaurant' },
  { value: 'shop', labelKey: 'parserCategoryShop' },
  { value: 'services', labelKey: 'parserCategoryServices' },
  { value: 'medical', labelKey: 'parserCategoryMedical' },
  { value: 'education', labelKey: 'parserCategoryEducation' },
  { value: 'auto', labelKey: 'parserCategoryAuto' },
  { value: 'beauty', labelKey: 'parserCategoryBeauty' },
  { value: 'fitness', labelKey: 'parserCategoryFitness' },
  { value: 'hospitality', labelKey: 'parserCategoryHospitality' },
  { value: 'tourism', labelKey: 'parserCategoryTourism' },
  { value: 'real_estate', labelKey: 'parserCategoryRealEstate' },
  { value: 'construction', labelKey: 'parserCategoryConstruction' },
  { value: 'finance', labelKey: 'parserCategoryFinance' },
  { value: 'legal', labelKey: 'parserCategoryLegal' },
  { value: 'it', labelKey: 'parserCategoryIt' },
  { value: 'entertainment', labelKey: 'parserCategoryEntertainment' }
];

export default function EmailParser() {
  const { t } = useLanguage();
  const [region, setRegion] = useState('Botanica, Chișinău, Moldova');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState([]);
  const [notice, setNotice] = useState(null);
  const searchControllerRef = useRef(null);
  const searchRunRef = useRef(0);

  const contacts = result?.contacts || [];
  const allSelected = contacts.length > 0 && selected.length === contacts.length;
  const selectedContacts = useMemo(
    () => contacts.filter(contact => selected.includes(contact.email)),
    [contacts, selected]
  );

  const handleSearch = async () => {
    const searchRegion = region.trim();
    const searchCategory = category;
    if (searchRegion.length < 3) {
      setNotice({ type: 'error', text: t('parserRegionRequired') });
      return;
    }

    searchControllerRef.current?.abort();
    const runId = searchRunRef.current + 1;
    searchRunRef.current = runId;
    setLoading(true);
    setProgress(null);
    const controller = new AbortController();
    searchControllerRef.current = controller;
    try {
      let offset = 0;
      let combined = null;
      const contactsByEmail = new Map(
        (result?.contacts || []).map(contact => [contact.email, contact])
      );

      do {
        let data;
        let lastError;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            ({ data } = await API.post('/parser/discover-region', {
              region: searchRegion,
              category: searchCategory,
              offset
            }, { signal: controller.signal }));
            break;
          } catch (error) {
            if (controller.signal.aborted) throw error;
            lastError = error;
            if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
        if (!data) throw lastError;
        if (runId !== searchRunRef.current) return;

        data.contacts.forEach(contact => contactsByEmail.set(contact.email, contact));
        combined = {
          ...data,
          contacts: [...contactsByEmail.values()],
          websitesChecked: data.nextOffset
        };
        setResult(combined);
        setSelected(current => [...new Set([...current, ...data.contacts.map(contact => contact.email)])]);
        setProgress({
          checked: data.nextOffset,
          total: data.websitesTotal
        });
        offset = data.nextOffset;
        if (!data.hasMore) break;
      } while (true);

      if (!combined || combined.contacts.length === 0) {
        setNotice({
          type: 'info',
          text: t('parserNoEmailsNotice')
        });
      } else {
        setNotice({
          type: 'success',
          text: t('parserResearchDone', { count: combined.contacts.length })
        });
      }
    } catch (error) {
      if (controller.signal.aborted) {
        if (runId === searchRunRef.current) {
          setNotice({
            type: 'info',
            text: t('parserSearchStopped')
          });
        }
        return;
      }
      setNotice({
        type: 'error',
        text: getApiErrorMessage(error, t('parserSearchFailed'))
      });
    } finally {
      if (runId === searchRunRef.current) {
        searchControllerRef.current = null;
        setLoading(false);
        setProgress(null);
      }
    }
  };

  const stopSearch = () => {
    searchRunRef.current += 1;
    searchControllerRef.current?.abort();
    searchControllerRef.current = null;
    setLoading(false);
    setProgress(null);
    setNotice({
      type: 'info',
      text: t('parserSearchStopped')
    });
  };

  const toggleContact = (email) => {
    setSelected(current => current.includes(email)
      ? current.filter(item => item !== email)
      : [...current, email]);
  };

  const toggleAll = () => {
    setSelected(allSelected ? [] : contacts.map(contact => contact.email));
  };

  const handleImport = () => {
    const verifiedContacts = selectedContacts.filter(contact =>
      contact.verified && contact.emailDomainValid
    );
    saveLocalContacts(verifiedContacts.map(contact => ({
      ...contact,
      name: contact.name || contact.company,
      region: contact.region || region.trim(),
      source: 'regional_discovery'
    })));
    setNotice({
      type: 'success',
      text: t('parserImportDone', { count: verifiedContacts.length })
    });
  };

  return (
    <>
      <Box className="page-heading">
        <Box>
          <Typography className="eyebrow">{t('parserDiscoveryEyebrow')}</Typography>
          <Typography variant="h3">{t('parserDiscoveryTitle')}</Typography>
          <Typography color="text.secondary">
            {t('parserDiscoverySubtitle')}
          </Typography>
        </Box>
      </Box>

      <Stack spacing={3}>
        <Paper className="parser-panel" sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack className="parser-search-fields" direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label={t('parserRegionLabel')}
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                placeholder={t('parserRegionPlaceholder')}
                InputProps={{ startAdornment: <MapPin size={19} style={{ marginRight: 10 }} /> }}
              />

              <FormControl fullWidth>
                <InputLabel>{t('parserBusinessTypeLabel')}</InputLabel>
                <Select
                  value={category}
                  label={t('parserBusinessTypeLabel')}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {CATEGORIES.map(item => (
                    <MenuItem key={item.value} value={item.value}>{t(item.labelKey)}</MenuItem>
                  ))}
                </Select>
              </FormControl>

            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<Search size={19} />}
                onClick={handleSearch}
              >
                {loading
                  ? t('parserSearchingSelected')
                  : result
                    ? t('parserAddResearch')
                    : t('parserSearchPublicEmails')}
              </Button>
              {loading && (
                <Button
                  variant="outlined"
                  color="warning"
                  size="large"
                  startIcon={<Square size={17} />}
                  onClick={stopSearch}
                  sx={{ minWidth: 230 }}
                >
                  {t('parserStop')} {progress ? `${progress.checked}/${progress.total}` : ''}
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>

        {loading && (
          <Alert severity="info">
            {t('parserVerifiedOnly')}
          </Alert>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Stack spacing={3}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                  gap: 2
                }}
              >
                {[
                  { icon: Building2, value: result.businessesScanned, label: t('parserBusinessesScanned') },
                  { icon: ExternalLink, value: result.websitesChecked, label: t('parserWebsitesChecked') },
                  { icon: Mail, value: contacts.length, label: t('parserValidatedEmails') }
                ].map(({ icon: Icon, value, label }) => (
                  <Paper key={label} sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Icon size={25} color="#7c3aed" />
                      <Box>
                        <Typography variant="h5">{value}</Typography>
                        <Typography color="text.secondary">{label}</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Box>

              <Paper className="parser-panel" sx={{ overflow: 'hidden' }}>
                <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    spacing={2}
                  >
                    <Box>
                      <Typography variant="h6">{t('parserFoundContacts')}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {result.region.displayName}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<Database size={18} />}
                      disabled={selectedContacts.length === 0}
                      onClick={handleImport}
                    >
                      {t('parserAddToDatabase', { count: selectedContacts.length })}
                    </Button>
                  </Stack>
                </Box>

                {contacts.length > 0 ? (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox checked={allSelected} onChange={toggleAll} />
                          </TableCell>
                          <TableCell>{t('parserPlaceHeader')}</TableCell>
                          <TableCell>{t('parserVerifiedEmailHeader')}</TableCell>
                          <TableCell>{t('parserPhoneHeader')}</TableCell>
                          <TableCell>{t('parserCategoryHeader')}</TableCell>
                          <TableCell>{t('parserAddressSiteHeader')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {contacts.map(contact => (
                          <TableRow key={contact.email} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selected.includes(contact.email)}
                                onChange={() => toggleContact(contact.email)}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography fontWeight={700}>{contact.name}</Typography>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <BadgeCheck size={14} color="#10b981" />
                                <Typography variant="caption" color="success.main">
                                  {contact.source === 'Official website' && contact.verificationLevel === 'official-domain'
                                    ? t('parserOfficialDomain')
                                    : t('parserPublicSource')}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography component="a" href={`mailto:${contact.email}`} color="primary">
                                {contact.email}
                              </Typography>
                              <Typography variant="caption" display="block" color="success.main">
                                DNS: {contact.emailDomainMethod === 'mx' ? t('parserMxVerified') : t('parserMailServerValid')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {contact.phone ? (
                                <Stack direction="row" spacing={0.75} alignItems="center">
                                  <Phone size={15} />
                                  <Typography component="a" href={`tel:${contact.phone}`} color="text.primary">
                                    {contact.phone}
                                  </Typography>
                                </Stack>
                              ) : (
                                <Typography variant="body2" color="text.secondary">{t('parserPhoneUnavailable')}</Typography>
                              )}
                            </TableCell>
                            <TableCell><Chip size="small" label={contact.category} /></TableCell>
                            <TableCell>
                              <Typography variant="body2">{contact.address || t('parserAddressUnavailable')}</Typography>
                              {contact.website && (
                                <Typography
                                  component="a"
                                  href={contact.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  variant="caption"
                                  color="primary"
                                  display="block"
                                >
                                  {t('parserOpenWebsite')}
                                </Typography>
                              )}
                              {!contact.website && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {t('parserWebsiteUnavailable')}
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                ) : (
                  <Box sx={{ p: 5, textAlign: 'center' }}>
                    <Mail size={38} color="#7c3aed" />
                    <Typography variant="h6" sx={{ mt: 1 }}>{t('parserNoPublicEmails')}</Typography>
                    <Typography color="text.secondary">
                      {t('parserTryBroader')}
                    </Typography>
                  </Box>
                )}

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 3, py: 2 }}>
                  {result.attribution}. {t('parserPublicAttribution')}
                </Typography>
              </Paper>
            </Stack>
          </motion.div>
        )}
      </Stack>

      <Snackbar open={Boolean(notice)} autoHideDuration={5000} onClose={() => setNotice(null)}>
        {notice && <Alert severity={notice.type}>{notice.text}</Alert>}
      </Snackbar>
    </>
  );
}
