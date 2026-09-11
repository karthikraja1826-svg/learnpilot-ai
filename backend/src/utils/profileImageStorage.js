import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PROFILE_PHOTO_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'profile-photos');
export const PROFILE_PHOTO_URL_PREFIX = '/uploads/profile-photos';

export const ensureProfilePhotoDir = () => {
  if (!fs.existsSync(PROFILE_PHOTO_DIR)) {
    fs.mkdirSync(PROFILE_PHOTO_DIR, { recursive: true });
  }
};

export const buildProfilePhotoUrl = (filename) => `${PROFILE_PHOTO_URL_PREFIX}/${filename}`;

export const isLocalProfilePhoto = (value) =>
  typeof value === 'string' && value.startsWith(`${PROFILE_PHOTO_URL_PREFIX}/`);

/**
 * Safely deletes a previously stored profile photo, but only if the given
 * value is one of *our* locally stored files (i.e. begins with our URL
 * prefix). This prevents accidentally deleting arbitrary paths and ignores
 * externally hosted images (e.g. a Google account picture URL).
 */
export const deleteStoredProfilePhoto = (profileImageValue) => {
  if (!isLocalProfilePhoto(profileImageValue)) {
    return;
  }

  const filename = path.basename(profileImageValue);
  const resolvedPath = path.join(PROFILE_PHOTO_DIR, filename);

  // Guard against path traversal: the resolved path must stay inside the
  // designated upload directory.
  if (!resolvedPath.startsWith(PROFILE_PHOTO_DIR)) {
    return;
  }

  fs.promises.unlink(resolvedPath).catch(() => {
    // File may already be gone; nothing further to do.
  });
};
