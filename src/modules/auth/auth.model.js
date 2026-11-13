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
      // Regex for standard 10-digit Indian mobile numbers
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit mobile number'] 
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Prevents accidental exposure in API responses
    },
    role: {
      type: String,
      enum: {
        values: ROLE_ARRAY,
        message: 'Invalid role provided'
      },
      default: USER_ROLES.PASSENGER,
    },
    
    // --- Security & Account Management ---
    passwordChangedAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
      select: false, // Internal flag for soft-deletes or banned users
    },

    masterList: [
  {
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ['M', 'F', 'T'], required: true },
  }
]
  },
  { 
    timestamps: true // Automatically manages createdAt and updatedAt
  }
);

// --- 1. Password Hashing Hook ---
userSchema.pre('save', async function () {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return;

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
});

// --- 2. Password Changed Timestamp Hook ---
userSchema.pre('save', function () {
  if (!this.isModified('password') || this.isNew) return;

  // Subtract 1 second to account for slight delays saving to DB vs issuing the JWT
  this.passwordChangedAt = Date.now() - 1000;
});

// --- 3. Filter Out Inactive Users Automatically ---
// This regex targets all 'find' queries (find, findOne, findAndUpdate, etc.)
userSchema.pre(/^find/, function () {
  // `this` points to the current query
  this.find({ isActive: { $ne: false } });
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