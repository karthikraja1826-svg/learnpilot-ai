import { User } from '../models/User.js';
import { isLocalProfilePhoto } from '../utils/profileImageStorage.js';

export const syncUserFromFirebase = async (firebaseUser) => {
  const existingUser = await User.findOne({ firebaseUid: firebaseUser.uid });

  if (existingUser) {
    if (firebaseUser.email && existingUser.email !== firebaseUser.email) {
      existingUser.email = firebaseUser.email;
    }
    if (
      firebaseUser.picture &&
      !isLocalProfilePhoto(existingUser.profileImage) &&
      !existingUser.profileImageRemovedByUser
    ) {
      existingUser.profileImage = firebaseUser.picture;
    }
    if (!existingUser.name && firebaseUser.name) {
      existingUser.name = firebaseUser.name;
    }
    await existingUser.save();
    return existingUser;
  }

  const newUser = await User.create({
    firebaseUid: firebaseUser.uid,
    email: firebaseUser.email,
    name: firebaseUser.name,
    profileImage: firebaseUser.picture,
    authProvider: firebaseUser.provider === 'google.com' ? 'google.com' : 'password',
  });

  return newUser;
};
