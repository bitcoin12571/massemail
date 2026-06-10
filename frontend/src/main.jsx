import React from 'react';
import ReactDOM from 'react-dom/client';
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import Dashboard from './pages/Dashboard.jsx';
import './styles.css';
import { LanguageProvider } from './i18n.jsx';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext.jsx';

const theme = createTheme({
  palette: {
    primary: { main: '#6756e8', dark: '#5142c8', contrastText: '#fff' },
    background: { default: '#f7f8fc', paper: '#fff' },
    text: { primary: '#202235', secondary: '#75788d' }
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h3: { fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em' },
    h5: { fontWeight: 800, letterSpacing: '-0.02em' },
    h6: { fontWeight: 800, letterSpacing: '-0.02em' },
    button: { textTransform: 'none', fontWeight: 700 }
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 10, boxShadow: 'none', padding: '9px 16px' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 18 } } }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageProvider>
        <UserPreferencesProvider>
          <Dashboard />
        </UserPreferencesProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);
