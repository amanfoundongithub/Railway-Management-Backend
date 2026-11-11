import jwt from 'jsonwebtoken';
import { User } from '../modules/auth/auth.model.js';

// 1. Protect routes (Check for valid token)
export const protect = async (req, res, next) => {
  try {
    let token;
    
    // Check if the Authorization header exists and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ 
        status: 'fail', 
        message: 'You are not logged in. Please log in to get access.' 
      });
    }

    // Verify token cryptographically
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists (in case they were deleted after token was issued)
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({ 
        status: 'fail', 
        message: 'The user belonging to this token no longer exists.' 
      });
    }

    // Check if user changed password AFTER the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({ 
        status: 'fail', 
        message: 'User recently changed their password. Please log in again.' 
      });
    }

    // GRANT ACCESS: Attach the user document to the request object
    req.user = currentUser;
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ status: 'fail', message: 'Invalid token. Please log in again.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'fail', message: 'Your token has expired. Please log in again.' });
    }
    next(error);
  }
};

// 2. Restrict to specific roles (RBAC)
// Example usage: restrictTo('ADMIN', 'STATION_MASTER')
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // req.user is set by the protect middleware right before this runs
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        status: 'fail', 
        message: 'You do not have permission to perform this action.' 
      });
    }
    next();
  };
};