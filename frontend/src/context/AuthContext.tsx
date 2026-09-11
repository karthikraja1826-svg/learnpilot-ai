import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { firebaseAuth } from '../config/firebase';
import * as authService from '../services/auth.service';
import type { UpdateProfileInput, UserProfile } from '../types/user';

export interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  registerWithEmail: (email: string, password: string, fullName: string) => Promise<boolean>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile>;
  updateProfile: (input: UpdateProfileInput) => Promise<UserProfile>;
  uploadProfilePhoto: (file: File) => Promise<UserProfile>;
  removeProfilePhoto: () => Promise<UserProfile>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const syncedProfile = await authService.syncUser();
    setProfile(syncedProfile);
    return syncedProfile;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        try {
          const syncedProfile = await authService.syncUser();
          setProfile(syncedProfile);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string, fullName: string) => {
    const { isNewUser } = await authService.registerWithEmail(email, password, fullName);
    return isNewUser;
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const { isNewUser } = await authService.loginWithEmail(email, password);
    return isNewUser;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const { isNewUser } = await authService.loginWithGoogle();
    return isNewUser;
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await authService.sendPasswordReset(email);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const updatedProfile = await authService.updateProfile(input);
    setProfile(updatedProfile);
    return updatedProfile;
  }, []);

  const uploadProfilePhoto = useCallback(async (file: File) => {
    const updatedProfile = await authService.uploadProfilePhoto(file);
    setProfile(updatedProfile);
    return updatedProfile;
  }, []);

  const removeProfilePhoto = useCallback(async () => {
    const updatedProfile = await authService.removeProfilePhoto();
    setProfile(updatedProfile);
    return updatedProfile;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      isLoading,
      isAuthenticated: Boolean(firebaseUser),
      registerWithEmail,
      loginWithEmail,
      loginWithGoogle,
      sendPasswordReset,
      logout,
      refreshProfile,
      updateProfile,
      uploadProfilePhoto,
      removeProfilePhoto,
    }),
    [
      firebaseUser,
      profile,
      isLoading,
      registerWithEmail,
      loginWithEmail,
      loginWithGoogle,
      sendPasswordReset,
      logout,
      refreshProfile,
      updateProfile,
      uploadProfilePhoto,
      removeProfilePhoto,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
