/**
 * Modern file picker with native Windows Explorer-like dialog
 * Uses File System Access API for better UX on Chrome/Edge
 */

export const createFileInput = async (options = {}) => {
  const {
    accept = '',
    multiple = false,
    onFile,
    folderMode = false
  } = options;

  const handleFiles = onFile || (() => {});

  // Use File System Access API for better file picker (Chrome/Edge)
  if ('showOpenFilePicker' in window) {
    try {
      const pickerOptions = {
        multiple: multiple,
        ...(accept === '.csv,text/csv' && {
          types: [
            {
              description: 'CSV Files',
              accept: { 'text/csv': ['.csv', '.txt'] }
            },
            {
              description: 'All Files',
              accept: { '*/*': ['.*'] }
            }
          ]
        }),
        ...(accept === 'image/*' && {
          types: [
            {
              description: 'Image Files',
              accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] }
            }
          ]
        })
      };

      const handles = await window.showOpenFilePicker(pickerOptions);

      if (handles && handles.length > 0) {
        // Convert file handles to File objects
        const files = await Promise.all(
          handles.map(async (handle) => {
            return await handle.getFile();
          })
        );

        handleFiles(files);
        return;
      }
    } catch (error) {
      // User cancelled - just return without error
      if (error.name === 'AbortError') {
        console.log('File picker cancelled by user');
        return;
      }
      console.warn('File System Access API error:', error);
      // Fall through to native file input
    }
  }

  // Fallback: Native file input (works on all browsers)
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
    const files = Array.from(e.target.files || []);

    // Filter for text/csv files if in folder mode
    if (folderMode) {
      const filtered = files.filter(f => f.name.endsWith('.txt') || f.name.endsWith('.csv'));
      onFile(filtered);
    } else {
      handleFiles(files);
    }
  };

  input.click();
};
