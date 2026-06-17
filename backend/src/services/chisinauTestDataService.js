const LOCATIONS = [
  { sector: 'Botanica', neighborhoods: ['Aeroport', 'Băcioii Noi', 'Frumușica', 'Muncești'], streets: ['bd. Dacia', 'str. Decebal', 'str. Grenoble', 'str. Independenței'] },
  { sector: 'Buiucani', neighborhoods: ['Durlești', 'Sculeni', 'Telecentru', 'Valea Morilor'], streets: ['str. Alba Iulia', 'str. Calea Ieșilor', 'str. Ion Creangă', 'str. Vasile Lupu'] },
  { sector: 'Centru', neighborhoods: ['Orașul de Jos', 'Orașul de Sus', 'Telecentru', 'Valea Dicescu'], streets: ['bd. Ștefan cel Mare', 'str. București', 'str. Ismail', 'str. Mihai Eminescu'] },
  { sector: 'Ciocana', neighborhoods: ['Budești', 'Colonița', 'Otovasca', 'Poșta Veche'], streets: ['bd. Mircea cel Bătrân', 'str. Alecu Russo', 'str. Ginta Latină', 'str. Uzinelor'] },
  { sector: 'Rîșcani', neighborhoods: ['Poșta Veche', 'Rîșcanii de Jos', 'Rîșcanii de Sus', 'Visterniceni'], streets: ['bd. Moscova', 'str. Alecu Russo', 'str. Kiev', 'str. Studenților'] }
];

const BUSINESS_TYPES = [
  { category: 'restaurant', label: 'Restaurant' },
  { category: 'shop', label: 'Magazin' },
  { category: 'services', label: 'Servicii' },
  { category: 'medical', label: 'Centru Medical' },
  { category: 'education', label: 'Centru Educațional' },
  { category: 'office', label: 'Companie' }
];

export const CHISINAU_TEST_EMAIL_DOMAIN = 'mailora.invalid';

export function isReservedTestEmail(email) {
  const domain = String(email || '').trim().toLowerCase().split('@')[1] || '';
  return domain === CHISINAU_TEST_EMAIL_DOMAIN ||
    domain.endsWith('.invalid') ||
    domain.endsWith('.test');
}

export function generateChisinauTestContacts(count, userId) {
  const safeCount = Math.min(Math.max(Number.parseInt(count, 10) || 10000, 100), 10000);
  const userToken = String(userId || 'user').replace(/[^a-z0-9]/gi, '').slice(0, 12).toLowerCase() || 'user';

  return Array.from({ length: safeCount }, (_, index) => {
    const location = LOCATIONS[index % LOCATIONS.length];
    const neighborhood = location.neighborhoods[Math.floor(index / LOCATIONS.length) % location.neighborhoods.length];
    const street = location.streets[Math.floor(index / (LOCATIONS.length * location.neighborhoods.length)) % location.streets.length];
    const businessType = BUSINESS_TYPES[index % BUSINESS_TYPES.length];
    const sequence = String(index + 1).padStart(5, '0');

    return {
      email: `chisinau.${userToken}.${sequence}@${CHISINAU_TEST_EMAIL_DOMAIN}`,
      name: `${businessType.label} ${location.sector} ${sequence}`,
      tags: ['load-test', 'chisinau', location.sector.toLowerCase(), businessType.category],
      status: 'active',
      verified: false,
      customData: {
        testData: true,
        city: 'Chișinău',
        sector: location.sector,
        neighborhood,
        category: businessType.category,
        address: `${street} ${10 + (index % 180)}, Chișinău`,
        source: 'generated_load_test'
      },
      createdBy: userId
    };
  });
}
