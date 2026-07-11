/**
 * Save and restore file picker directory using localStorage
 * Falls back to system defaults if not available
 */

const STORAGE_KEY = 'mailora_last_import_folder';
const STORAGE_KEY_TIMESTAMP = 'mailora_last_import_folder_time';
const FOLDER_MEMORY_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export const getLastImportFolder = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const timestamp = localStorage.getItem(STORAGE_KEY_TIMESTAMP);

    if (!stored || !timestamp) return null;

    // Check if memory expired
    if (Date.now() - parseInt(timestamp) > FOLDER_MEMORY_DURATION) {
      clearLastImportFolder();
      return null;
    }

    return stored;
  } catch (error) {
    console.warn('Error retrieving last import folder:', error);
    return null;
  }
};

export const saveLastImportFolder = (folderPath) => {
  try {
    if (folderPath) {
      localStorage.setItem(STORAGE_KEY, folderPath);
      localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());
    }
  } catch (error) {
    console.warn('Error saving last import folder:', error);
  }
};

export const clearLastImportFolder = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_TIMESTAMP);
  } catch (error) {
    console.warn('Error clearing last import folder:', error);
  }
};

/**
 * Create file input with memory of last used directory
 * This uses the File System Access API when available
 */
export const createFileInput = async (options = {}) => {
  const {
    accept = '',
    multiple = false,
    onFile = () => {}
  } = options;

  // Try to use File System Access API (Chrome 86+)
  if ('showOpenFilePicker' in window) {
    try {
      const pickerOptions = {
        types: accept ? [
          {
            description: 'Import Files',
            accept: { 'text/csv': ['.csv'] }
          }
        ] : undefined,
        multiple: multiple
      };

      const handles = await window.showOpenFilePicker(pickerOptions);

      if (handles && handles.length > 0) {
        // Save the directory of the first selected file
        const handle = handles[0];
        const parent = await handle.getParent?.();
        if (parent) {
          const folderName = parent.name;
          saveLastImportFolder(folderName);
        }

        // Convert file handles to File objects
        const files = await Promise.all(
          handles.map(async (handle) => {
            const file = await handle.getFile();
            return file;
          })
        );

        onFile(files);
        return;
      }
    } catch (error) {
      // User cancelled or error occurred - fallback to regular input
      console.warn('File System Access API error:', error);
    }
  }

  // Fallback: Regular file input
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.multiple = multiple;

  input.onchange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Try to extract folder info from file path (limited in browsers)
      const filePath = files[0].webkitRelativePath || files[0].name;
      if (filePath.includes('/')) {
        const folderName = filePath.split('/')[0];
        saveLastImportFolder(folderName);
      }
    }
    onFile(files);
  };

  input.click();
};
