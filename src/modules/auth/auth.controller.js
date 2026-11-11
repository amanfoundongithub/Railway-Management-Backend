import jwt from 'jsonwebtoken';
import { User } from './auth.model.js';

// Generate a JWT Token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d', // Token expires in 7 days
  });
};

export const register = async (req, res, next) => {
  try {
    const { fullName, email, phoneNumber, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existingUser) {
      return res.status(400).json({ 
        status: 'fail', 
        message: 'A user with this email or phone number already exists' 
      });
    }

    // Create the user (Password is hashed in the Mongoose pre-save hook)
    const newUser = await User.create({ fullName, email, phoneNumber, password, role });

    const token = signToken(newUser._id);
    newUser.password = undefined; // Strip password from output

    res.status(201).json({
      status: 'success',
      token,
      data: { user: newUser },
    });
  } catch (error) {
    next(error); // Pass any unexpected errors to the global error handler
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Fetch user and explicitly select the password field for comparison
    const user = await User.findOne({ email }).select('+password');

    // Verify user exists and password is correct
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({ 
        status: 'fail', 
        message: 'Incorrect email or password' 
      });
    }

    const token = signToken(user._id);
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      token,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};