function splitRow(row) {
  const values = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"' && row[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
}

export function parseCSV(csvData) {
  if (typeof csvData !== 'string' || !csvData.trim()) return [];

  const rows = csvData.trim().split(/\r?\n/).filter(Boolean);

  if (rows.length === 0) {
    throw new Error('CSV is empty');
  }

  // Check if first row looks like a header (contains 'email' keyword)
  const firstRow = rows[0].toLowerCase();
  const looksLikeHeader = firstRow.includes('email') || firstRow.includes('mail') || firstRow.includes('name');

  let headers = [];
  let dataRows = rows;

  if (looksLikeHeader && rows.length > 1) {
    // Treat first row as header
    headers = splitRow(rows.shift()).map((header) => header.toLowerCase());
  } else if (!firstRow.includes('@')) {
    // First row doesn't look like email data, assume it's a header
    headers = splitRow(rows.shift()).map((header) => header.toLowerCase());
  } else {
    // No header detected, treat as plain email list
    return rows
      .filter((row) => row.includes('@'))
      .map((email) => ({
        email: email.trim().toLowerCase(),
        name: '',
        tags: [],
        customData: {}
      }));
  }

  const indexOf = (...names) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const emailIndex = indexOf('email', 'email address', 'e-mail');
  const nameIndex = indexOf('name', 'full name', 'fullname');
  const firstNameIndex = indexOf('firstname', 'first name', 'first_name');
  const lastNameIndex = indexOf('lastname', 'last name', 'last_name');
  const companyIndex = indexOf('company', 'organization', 'org');
  const tagsIndex = indexOf('tags', 'tag');

  if (emailIndex === -1) throw new Error('CSV must contain an email column');

  return dataRows.map(splitRow).filter((values) => values[emailIndex]).map((values) => ({
    email: values[emailIndex]?.toLowerCase().trim() || '',
    name: nameIndex >= 0
      ? values[nameIndex]
      : [values[firstNameIndex], values[lastNameIndex]].filter(Boolean).join(' '),
    tags: tagsIndex >= 0 ? values[tagsIndex].split(';').map((tag) => tag.trim()).filter(Boolean) : [],
    customData: { company: companyIndex >= 0 ? values[companyIndex] : '' }
  })).filter((c) => c.email); // Filter out empty emails
}
