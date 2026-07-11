/**
 * Modern file picker with native Windows Explorer-like dialog
 * Uses File System Access API for better UX on Chrome/Edge
 */

export const createFileInput = async (options = {}) => {
  console.log(`🎯 createFileInput called with options:`, options);
  const {
    accept = '',
    multiple = false,
    onFile,
    folderMode = false
  } = options;

  const handleFiles = onFile || (() => {});
  console.log(`   onFile callback provided: ${!!onFile}`);

  // Standard native file input (most reliable)
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.multiple = multiple;

  // For folder selection fallback (limited support)
  if (folderMode) {
    input.webkitdirectory = true;
    input.mozdirectory = true;
  }

  input.onchange = (e) => {
    console.log(`📁 File picker onchange triggered`);
    const files = Array.from(e.target.files || []);
    console.log(`   Selected files: ${files.length}`);
    files.forEach((f, i) => console.log(`     [${i}] ${f.name} (${f.size} bytes)`));

    // Filter for text/csv files if in folder mode
    if (folderMode) {
      const filtered = files.filter(f => f.name.endsWith('.txt') || f.name.endsWith('.csv'));
      console.log(`   Filtered to ${filtered.length} files`);
      onFile(filtered);
    } else {
      console.log(`   Calling handleFiles with ${files.length} files`);
      handleFiles(files);
    }
  };

  console.log(`   Clicking file input...`);
  input.click();
  console.log(`   File input clicked`);
};
