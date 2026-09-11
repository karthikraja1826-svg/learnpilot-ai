import { promises as fsp } from 'fs';
import { User } from '../models/User.js';
import { syncUserFromFirebase } from '../services/auth.service.js';
import { validateProfileInput, hasRequiredOnboardingData } from '../utils/validateProfileInput.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { buildProfilePhotoUrl, deleteStoredProfilePhoto } from '../utils/profileImageStorage.js';

export const syncUser = async (req, res, next) => {
  try {
    const user = await syncUserFromFirebase(req.firebaseUser);
    sendSuccess(res, 200, 'User synchronized', { user });
  } catch (err) {
    next(err);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ firebaseUid: req.firebaseUser.uid });

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    sendSuccess(res, 200, 'Current user retrieved', { user });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ firebaseUid: req.firebaseUser.uid });

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    sendSuccess(res, 200, 'Profile retrieved', { user });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { errors, update } = validateProfileInput(req.body || {});

    if (errors.length > 0) {
      return next(new ApiError(400, errors.join('; ')));
    }

    let existingUser;

    if (update.onboardingCompleted === true) {
      existingUser = await User.findOne({ firebaseUid: req.firebaseUser.uid });

      if (!existingUser) {
        return next(new ApiError(404, 'User not found'));
      }

      if (!hasRequiredOnboardingData(existingUser, update)) {
        return next(
          new ApiError(400, 'Onboarding cannot be marked complete until the required profile information has been provided')
        );
      }
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.firebaseUser.uid },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    sendSuccess(res, 200, 'Profile updated', { user });
  } catch (err) {
    next(err);
  }
};

export const uploadProfilePhoto = async (req, res, next) => {
  try {
    const existingUser = await User.findOne({ firebaseUid: req.firebaseUser.uid });

    if (!existingUser) {
      await fsp.unlink(req.file.path).catch(() => {});
      return next(new ApiError(404, 'User not found'));
    }

    const previousProfileImage = existingUser.profileImage;
    const newProfileImageUrl = buildProfilePhotoUrl(req.file.filename);

    existingUser.profileImage = newProfileImageUrl;
    existingUser.profileImageUpdatedAt = new Date();
    existingUser.profileImageRemovedByUser = false;
    await existingUser.save();

    deleteStoredProfilePhoto(previousProfileImage);

    sendSuccess(res, 200, 'Profile photo updated', { user: existingUser });
  } catch (err) {
    next(err);
  }
};

export const removeProfilePhoto = async (req, res, next) => {
  try {
    const existingUser = await User.findOne({ firebaseUid: req.firebaseUser.uid });

    if (!existingUser) {
      return next(new ApiError(404, 'User not found'));
    }

    const previousProfileImage = existingUser.profileImage;

    existingUser.profileImage = undefined;
    existingUser.profileImageUpdatedAt = undefined;
    existingUser.profileImageRemovedByUser = true;
    await existingUser.save();

    deleteStoredProfilePhoto(previousProfileImage);

    sendSuccess(res, 200, 'Profile photo removed', { user: existingUser });
  } catch (err) {
    next(err);
  }
};
