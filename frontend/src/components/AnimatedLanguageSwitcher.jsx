import React from 'react';
import { motion } from 'framer-motion';
import { Button, Box } from '@mui/material';
import { useLanguage } from '../i18n.jsx';

export default function AnimatedLanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const languages = [
    { code: 'ro', label: 'RO', flag: '🇷🇴' },
    { code: 'ru', label: 'RU', flag: '🇷🇺' },
    { code: 'en', label: 'EN', flag: '🇬🇧' }
  ];

  return (
    <Box className="language-switcher">
      {languages.map(({ code, label, flag }) => (
        <motion.div
          key={code}
          initial={false}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            className={language === code ? 'active' : ''}
            onClick={() => setLanguage(code)}
            title={`Switch to ${label}`}
            sx={{
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',

              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1), transparent)',
                opacity: 0,
                transition: 'opacity 0.3s ease',
              },

              '&:hover::before': {
                opacity: language === code ? 0 : 1,
              }
            }}
          >
            <span style={{ marginRight: '4px' }}>{flag}</span>
            {label}
          </Button>
        </motion.div>
      ))}

      {/* Active indicator */}
      <motion.div
        layoutId="languageIndicator"
        className="language-indicator"
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
    </Box>
  );
}
