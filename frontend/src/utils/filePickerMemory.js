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
 * Uses native file picker for best UX
 */
export const createFileInput = async (options = {}) => {
  const {
    accept = '',
    multiple = false,
    onFile = () => {}
  } = options;

  // Use simple, reliable native file input
  // This provides the best cross-browser compatibility
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.multiple = multiple;

  input.onchange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Save folder info when files are selected
      try {
        const filePath = files[0].webkitRelativePath || files[0].name;
        if (filePath.includes('/')) {
          const folderName = filePath.split('/')[0];
          saveLastImportFolder(folderName);
        }
      } catch (error) {
        console.warn('Error saving folder info:', error);
      }
    }
    onFile(files);
  };

  // Handle cancellation
  input.oninput = null;

  input.click();
};
