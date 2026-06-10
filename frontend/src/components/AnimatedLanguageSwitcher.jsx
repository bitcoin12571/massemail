import React from 'react';
import { Button, Box } from '@mui/material';
import { useLanguage } from '../i18n.jsx';

export default function AnimatedLanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const languages = [
    { code: 'ru', label: 'RU' },
    { code: 'ro', label: 'RO' },
    { code: 'en', label: 'ENG' }
  ];

  return (
    <Box className="language-switcher">
      {languages.map(({ code, label }) => (
        <Button
          key={code}
          className={language === code ? 'active' : ''}
          onClick={() => setLanguage(code)}
          aria-pressed={language === code}
        >
          {label}
        </Button>
      ))}
    </Box>
  );
}
