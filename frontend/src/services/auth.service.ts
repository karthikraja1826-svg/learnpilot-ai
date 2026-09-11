import {
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as updateFirebaseProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { firebaseAuth, googleAuthProvider } from '../config/firebase';
import { api } from './api';
import type { ApiSuccess } from '../types/api';
import type { UpdateProfileInput, UserProfile } from '../types/user';

export interface AuthResult {
  user: FirebaseUser;
  isNewUser: boolean;
}

export async function registerWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<AuthResult> {
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  await updateFirebaseProfile(credential.user, { displayName: fullName });

  return { user: credential.user, isNewUser: true };
}

export async function loginWithEmail(email: string, password: string): Promise<AuthResult> {
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  return { user: credential.user, isNewUser: false };
}

export async function loginWithGoogle(): Promise<AuthResult> {
  const credential = await signInWithPopup(firebaseAuth, googleAuthProvider);
  const additionalInfo = getAdditionalUserInfo(credential);

  return { user: credential.user, isNewUser: additionalInfo?.isNewUser ?? false };
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(firebaseAuth, email);
}

export async function logout(): Promise<void> {
  await signOut(firebaseAuth);
}

export async function syncUser(): Promise<UserProfile> {
  const response = await api.post<ApiSuccess<{ user: UserProfile }>>('/auth/sync');
  return response.data.data.user;
}

export async function getCurrentUser(): Promise<UserProfile> {
  const response = await api.get<ApiSuccess<{ user: UserProfile }>>('/auth/me');
  return response.data.data.user;
}

export async function getProfile(): Promise<UserProfile> {
  const response = await api.get<ApiSuccess<{ user: UserProfile }>>('/auth/profile');
  return response.data.data.user;
}

export async function updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
  const response = await api.put<ApiSuccess<{ user: UserProfile }>>('/auth/profile', input);
  return response.data.data.user;
}

export async function uploadProfilePhoto(file: File): Promise<UserProfile> {
  const formData = new FormData();
  formData.append('photo', file);

  // Let the browser set 'Content-Type: multipart/form-data; boundary=...'
  // itself — the shared `api` instance has no default Content-Type, so
  // nothing here needs to override it.
  const response = await api.post<ApiSuccess<{ user: UserProfile }>>('/auth/profile/photo', formData);
  return response.data.data.user;
}

export async function removeProfilePhoto(): Promise<UserProfile> {
  const response = await api.delete<ApiSuccess<{ user: UserProfile }>>('/auth/profile/photo');
  return response.data.data.user;
}
