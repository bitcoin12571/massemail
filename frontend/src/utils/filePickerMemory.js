/**
 * Modern file picker with native Windows Explorer-like dialog
 * Uses File System Access API for better UX on Chrome/Edge
 */

export const createFileInput = async (options = {}) => {
  const {
    accept = '',
    multiple = false,
    onFile = () => {}
  } = options;

  // Try File System Access API first (Chrome/Edge) - shows proper file explorer dialog
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

        onFile(files);
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

  input.onchange = (e) => {
    const files = Array.from(e.target.files || []);
    onFile(files);
  };

  input.click();
};
