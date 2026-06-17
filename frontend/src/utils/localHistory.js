const HISTORY_KEY = 'mailoraSendHistory';

export function getLocalSendHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

export function addLocalSendHistory(entry) {
  const history = getLocalSendHistory();
  const nextEntry = {
    id: entry.id || `local-${Date.now()}`,
    source: entry.source || 'local',
    name: entry.name || entry.subject || 'Email campaign',
    subject: entry.subject || '',
    status: entry.failedCount > 0 ? 'completed_with_errors' : 'completed',
    totalRecipients: Number(entry.totalRecipients) || 0,
    sentCount: Number(entry.sentCount) || 0,
    failedCount: Number(entry.failedCount) || 0,
    openedCount: Number(entry.openedCount) || 0,
    clickedCount: Number(entry.clickedCount) || 0,
    createdAt: entry.createdAt || new Date().toISOString(),
    sentAt: entry.sentAt || new Date().toISOString(),
    // NEW: Recipients individual list
    recipients: Array.isArray(entry.recipients) ? entry.recipients : []
  };

  const withoutExisting = history.filter(item => item.id !== nextEntry.id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([nextEntry, ...withoutExisting].slice(0, 200)));
  window.dispatchEvent(new Event('mailora:history-updated'));
  return nextEntry;
}

export function removeLocalSendHistory(id) {
  const history = getLocalSendHistory().filter(entry => entry.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  window.dispatchEvent(new Event('mailora:history-updated'));
}
