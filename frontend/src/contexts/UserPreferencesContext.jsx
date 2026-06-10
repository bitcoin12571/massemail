import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';

const PreferencesContext = createContext(null);

const DEFAULT_PREFERENCES = {
  refreshInterval: 2500, // milliseconds
  theme: 'light', // light/dark
  animationsEnabled: true,
  autoRefreshQueue: true,
  notificationsEnabled: true,
  compactMode: false
};

const REFRESH_INTERVALS = [
  { label: 'Every 2.5s', value: 2500 },
  { label: 'Every 5s', value: 5000 },
  { label: 'Every 10s', value: 10000 },
  { label: 'Every 30s', value: 30000 },
  { label: 'Manual only', value: null }
];

export function UserPreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(() => {
    try {
      const stored = localStorage.getItem('mailCenterPreferences');
      return stored
        ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) }
        : DEFAULT_PREFERENCES;
    } catch (error) {
      console.error('Failed to load preferences:', error);
      return DEFAULT_PREFERENCES;
    }
  });

  // Save to localStorage whenever preferences change
  useEffect(() => {
    try {
      localStorage.setItem('mailCenterPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, [preferences]);

  const updatePreference = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateMultiple = (updates) => {
    setPreferences(prev => ({
      ...prev,
      ...updates
    }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.removeItem('mailCenterPreferences');
  };

  const value = useMemo(
    () => ({
      preferences,
      updatePreference,
      updateMultiple,
      resetPreferences,
      REFRESH_INTERVALS
    }),
    [preferences]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  }
  return context;
}
