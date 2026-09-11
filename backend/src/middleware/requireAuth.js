import { firebaseAuth } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new ApiError(401, 'Authorization header is required'));
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return next(new ApiError(401, 'Authorization header must use the Bearer scheme'));
  }

  const idToken = parts[1];

  try {
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);

    req.firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
      provider: decodedToken.firebase?.sign_in_provider,
    };

    next();
  } catch (err) {
    if (err.code === 'auth/id-token-expired') {
      return next(new ApiError(401, 'Firebase token has expired'));
    }

    next(new ApiError(401, 'Invalid Firebase token'));
  }
};
