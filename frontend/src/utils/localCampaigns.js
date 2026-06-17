const CAMPAIGNS_KEY = 'mailoraBulkCampaigns';

export function getLocalCampaigns() {
  try {
    const campaigns = JSON.parse(localStorage.getItem(CAMPAIGNS_KEY) || '[]');
    return Array.isArray(campaigns) ? campaigns : [];
  } catch {
    return [];
  }
}

export function saveLocalCampaign(campaign) {
  if (!campaign?.id) return campaign;

  const campaigns = getLocalCampaigns();
  const existing = campaigns.find(item => String(item.id) === String(campaign.id));
  const { attachments, ...campaignWithoutLargeAttachments } = campaign;
  const saved = {
    ...existing,
    ...campaignWithoutLargeAttachments,
    createdAt: campaign.createdAt || existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const next = [
    saved,
    ...campaigns.filter(item => String(item.id) !== String(campaign.id))
  ].slice(0, 200);

  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('mailora:campaigns-updated'));
  return saved;
}

export function saveLocalCampaigns(campaigns = []) {
  campaigns.forEach(saveLocalCampaign);
  return getLocalCampaigns();
}

export function removeLocalCampaign(id) {
  const next = getLocalCampaigns().filter(item => String(item.id) !== String(id));
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('mailora:campaigns-updated'));
}

export function mergeCampaigns(serverCampaigns = []) {
  const merged = new Map();

  [...serverCampaigns, ...getLocalCampaigns()].forEach(campaign => {
    if (!campaign?.id) return;
    const key = String(campaign.id);
    merged.set(key, { ...merged.get(key), ...campaign });
  });

  return [...merged.values()].sort(
    (left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt)
  );
}
