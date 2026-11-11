import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES, ROLE_ARRAY } from '../../utils/constants.js';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    phoneNumber: {
      type: String,
      required: [true, 'Please provide a mobile number for ticket alerts'],
      unique: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit mobile number'] 
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, 
    },
    role: {
      type: String,
      enum: {
        values: ROLE_ARRAY,
        message: 'Invalid role provided'
      },
      default: USER_ROLES.PASSENGER,
    },
    
    passwordChangedAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
      select: false, 
    }
  },
  { 
    timestamps: true 
  }
);

// --- 1. Password Hashing Hook ---
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// --- 2. Password Changed Timestamp Hook ---
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// --- 3. Filter Out Inactive Users Automatically ---
userSchema.pre(/^find/, function (next) {
  this.find({ isActive: { $ne: false } });
  next();
});

// --- 4. Instance Method: Verify Password ---
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// --- 5. Instance Method: Check if password changed after token was issued ---
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

export const User = mongoose.model('User', userSchema);