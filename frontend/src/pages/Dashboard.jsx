import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  Stack,
  Typography
} from '@mui/material';
import {
  BarChart3,
  ContactRound,
  History,
  LogOut,
  MailPlus,
  Menu,
  Search
} from 'lucide-react';
import CampaignDashboard from './CampaignDashboard';
import QueueMonitor from '../components/QueueMonitor';
import ContactsManager from './ContactsManager';
import SendEmail from './SendEmail';
import { useLanguage } from '../i18n.jsx';
import { pageTransition } from '../utils/animations';
import AnimatedLanguageSwitcher from '../components/AnimatedLanguageSwitcher';
import smartGrowthLogo from '../assets/smart-growth-ai-logo.png';

export default function Dashboard({ user, onLogout }) {
  const { t } = useLanguage();
  const [activePage, setActivePage] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const navigation = [
    { label: t('emailDatabase'), icon: ContactRound },
    { label: t('sendNow'), icon: MailPlus },
    { label: t('sendHistory'), icon: History },
    { label: t('deliveryStatus'), icon: BarChart3 }
  ];

  return (
    <Box className="app-shell">
      <Box component="aside" className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <Box className="brand">
          <Box
            component="img"
            className="brand-logo"
            src={smartGrowthLogo}
            alt="Smart Growth AI"
          />
          <Box>
            <Typography className="brand-name">Smart Growth AI</Typography>
            <Typography className="brand-subtitle">Internal system</Typography>
          </Box>
        </Box>

        <Typography className="nav-caption">{t('companyTools')}</Typography>
        <Stack spacing={0.75}>
          {navigation.map(({ label, icon: Icon }, index) => (
            <Button
              key={label}
              className={`nav-item ${activePage === index ? 'active' : ''}`}
              startIcon={<Icon size={19} />}
              onClick={() => {
                setActivePage(index);
                setMobileNav(false);
              }}
            >
              {label}
              {index === 3 && <Box component="span" className="live-dot" />}
            </Button>
          ))}
        </Stack>

        <Box className="sidebar-spacer" />

        <Box className="profile-card">
          <Avatar sx={{ width: 38, height: 38, bgcolor: '#d9f6ea', color: '#087a55' }}>AM</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={700} noWrap>{user?.name || t('administrator')}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{user?.email || t('companyAccess')}</Typography>
          </Box>
          <IconButton size="small" aria-label="Log out" onClick={onLogout}>
            <LogOut size={17} />
          </IconButton>
        </Box>
      </Box>

      {mobileNav && <Box className="nav-backdrop" onClick={() => setMobileNav(false)} />}

      <Box component="main" className="main-panel">
        <Box component="header" className="topbar">
          <IconButton className="mobile-menu" onClick={() => setMobileNav(true)}>
            <Menu size={21} />
          </IconButton>
          <Box className="search-box">
            <Search size={18} />
            <input aria-label="Search" placeholder={t('searchDatabase')} />
            <Box component="span">⌘ K</Box>
          </Box>
          <Box className="topbar-actions">
            <AnimatedLanguageSwitcher />
          </Box>
        </Box>

        <Box className="page-content">
          <AnimatePresence mode="wait">
            {activePage === 0 && (
              <motion.div
                key="contacts"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageTransition}
              >
                <ContactsManager mode="database" />
              </motion.div>
            )}
            {activePage === 1 && (
              <motion.div
                key="send"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageTransition}
              >
                <SendEmail onOpenSettings={() => setActivePage(4)} />
              </motion.div>
            )}
            {activePage === 2 && (
              <motion.div
                key="campaign"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageTransition}
              >
                <CampaignDashboard onOpenDatabase={() => setActivePage(1)} />
              </motion.div>
            )}
            {activePage === 3 && (
              <motion.div
                key="queue"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageTransition}
              >
                <QueueMonitor />
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Box>
    </Box>
  );
}
