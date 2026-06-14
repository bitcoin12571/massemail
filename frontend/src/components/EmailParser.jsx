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
  Typography
} from '@mui/material';
import { Upload, MapPin, Mail, BarChart3, CheckCircle2 } from 'lucide-react';
import API, { getApiErrorMessage } from '../services/api';
import { useLanguage } from '../i18n.jsx';

export default function EmailParser() {
  const { t } = useLanguage();
  const [csvContent, setCsvContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [regions, setRegions] = useState([]);
  const [regionStats, setRegionStats] = useState([]);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    fetchRegions();
  }, []);

  const fetchRegions = async () => {
    try {
      const { data } = await API.get('/parser/regions');
      setRegions(data.regions);

      const { data: stats } = await API.get('/parser/regions/stats');
      setRegionStats(stats.stats);
    } catch (error) {
      console.error('Failed to fetch regions:', error);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleParseCsv = async () => {
    if (!csvContent.trim()) {
      setNotice({ type: 'error', text: 'Please upload or paste CSV content' });
      return;
    }

    setLoading(true);
    try {
      const { data } = await API.post('/parser/upload-csv', { csvContent });

      setResults(data);
      setNotice({ type: 'success', text: `${data.validEmails} emails imported successfully!` });

      // Refresh regions
      setTimeout(fetchRegions, 500);
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, 'Failed to parse CSV') });
    } finally {
      setLoading(false);
    }
  };

  const handleValidateEmails = async () => {
    setLoading(true);
    try {
      const { data } = await API.post('/parser/validate');
      setNotice({ type: 'success', text: `Validation complete: ${data.validEmails} valid, ${data.fixedCount} fixed` });
    } catch (error) {
      setNotice({ type: 'error', text: getApiErrorMessage(error, 'Validation failed') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box className="page-heading">
        <Box>
          <Typography className="eyebrow">BULK EMAIL</Typography>
          <Typography variant="h3">Email Parser & Segmentation</Typography>
          <Typography color="text.secondary">Import and organize emails by region</Typography>
        </Box>
      </Box>

      <Stack spacing={3}>
        {/* CSV Upload Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>📤 Upload CSV File</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Format: email, name, region (one per line)
          </Typography>

          <Stack spacing={2}>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />

            <TextField
              multiline
              rows={6}
              placeholder="Or paste CSV content here..."
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              variant="outlined"
              fullWidth
            />

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                startIcon={<Upload size={18} />}
                onClick={handleParseCsv}
                disabled={loading || !csvContent.trim()}
              >
                {loading ? 'Processing...' : 'Parse & Import'}
              </Button>

              <Button
                variant="outlined"
                onClick={handleValidateEmails}
                disabled={loading || regionStats.length === 0}
              >
                Validate All Emails
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Import Results */}
        {results && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Paper sx={{ p: 3, backgroundColor: '#f0f9ff' }}>
              <Stack direction="row" spacing={3} alignItems="center">
                <CheckCircle2 size={32} color="#10b981" />
                <Box>
                  <Typography variant="h6">✅ Import Successful!</Typography>
                  <Typography variant="body2">
                    {results.validEmails} valid emails imported from {results.totalProcessed} rows
                  </Typography>
                  {results.errors.length > 0 && (
                    <Typography variant="caption" color="error">
                      {results.errors.length} errors found
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Paper>
          </motion.div>
        )}

        {/* Region Statistics */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>📊 Region Statistics</Typography>

          {regionStats.length > 0 ? (
            <Box sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f3f4f6' }}>
                    <TableCell><MapPin size={18} /> Region</TableCell>
                    <TableCell align="right"><Mail size={18} /> Email Count</TableCell>
                    <TableCell align="right">Percentage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {regionStats.map((stat) => {
                    const total = regionStats.reduce((sum, s) => sum + parseInt(s.count), 0);
                    const percentage = ((parseInt(stat.count) / total) * 100).toFixed(1);
                    return (
                      <TableRow key={stat.region} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MapPin size={16} />
                            {stat.region || 'unknown'}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{stat.count}</TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress variant="determinate" value={parseFloat(percentage)} sx={{ flex: 1, maxWidth: '100px' }} />
                            <Typography variant="caption">{percentage}%</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <Typography color="text.secondary">No data yet. Upload a CSV to get started.</Typography>
          )}
        </Paper>
      </Stack>

      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice(null)}>
        {notice && <Alert severity={notice.type}>{notice.text}</Alert>}
      </Snackbar>
    </>
  );
}
