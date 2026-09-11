import { FirebaseError } from 'firebase/app';
import { ApiRequestError } from '../services/api';

const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'That email or password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/user-not-found': 'That email or password is incorrect.',
  'auth/wrong-password': 'That email or password is incorrect.',
  'auth/user-disabled': 'This account has been disabled. Contact support for help.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/popup-blocked': 'Your browser blocked the sign-in popup. Allow popups and try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled before it finished.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled before it finished.',
  'auth/account-exists-with-different-credential':
    'An account already exists with this email using a different sign-in method.',
  'auth/requires-recent-login': 'Please sign in again to continue.',
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return FIREBASE_MESSAGES[error.code] ?? 'Something went wrong. Please try again.';
  }

  if (error instanceof ApiRequestError) {
    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (error.status === 0) {
      return 'We could not reach the server. Check your connection and try again.';
    }
    return error.message || 'We could not sync your account. Please try again.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}
