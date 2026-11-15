import jwt from 'jsonwebtoken';
import { User } from '../modules/auth/auth.model.js';

export const protect = async (req, res, next) => {
  try {
    // Token deserialization from authorization header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Token not found: Return 401
    if (!token) {
      return res.status(401).json({ 
        status: 'fail', 
        message: 'You are not logged in. Please login to access this resource.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return res.status(404).json({ 
        status: 'fail', 
        message: 'The user belonging to this token does not exist any more.' 
      });
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({ 
        status: 'fail', 
        message: 'User recently changed their password. Please log in again.' 
      });
    }
    req.user = currentUser;
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        status: 'fail', 
        message: 'Invalid token. Please log in again.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        status: 'fail', 
        message: 'Your token has expired. Please log in again.' 
      });
    }
    next(error);
  }
};


export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        status: 'fail', 
        message: 'You do not have permission to access this resource.' 
      });
    }
    next();
  };
};