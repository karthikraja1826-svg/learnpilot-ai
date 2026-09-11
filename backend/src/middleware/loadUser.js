import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export const loadUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ firebaseUid: req.firebaseUser.uid }).select('_id');

    if (!user) {
      return next(new ApiError(404, 'User record not found. Please sync your account first.'));
    }

    req.userId = user._id;
    next();
  } catch (err) {
    next(err);
  }
};
