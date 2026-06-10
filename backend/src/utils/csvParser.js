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
  const headers = splitRow(rows.shift()).map((header) => header.toLowerCase());
  const indexOf = (...names) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const emailIndex = indexOf('email', 'email address');
  const nameIndex = indexOf('name', 'full name');
  const firstNameIndex = indexOf('firstname', 'first name');
  const lastNameIndex = indexOf('lastname', 'last name');
  const companyIndex = indexOf('company', 'organization');
  const tagsIndex = indexOf('tags', 'tag');

  if (emailIndex === -1) throw new Error('CSV must contain an email column');

  return rows.map(splitRow).filter((values) => values[emailIndex]).map((values) => ({
    email: values[emailIndex].toLowerCase(),
    name: nameIndex >= 0
      ? values[nameIndex]
      : [values[firstNameIndex], values[lastNameIndex]].filter(Boolean).join(' '),
    tags: tagsIndex >= 0 ? values[tagsIndex].split(';').map((tag) => tag.trim()).filter(Boolean) : [],
    customData: { company: companyIndex >= 0 ? values[companyIndex] : '' }
  }));
}
