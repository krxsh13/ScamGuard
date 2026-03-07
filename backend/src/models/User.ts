import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date;
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  preferences: {
    emailNotifications: boolean;
    theme: 'light' | 'dark';
  };
  stats: {
    totalScans: number;
    scamsDetected: number;
    quizzesTaken: number;
    averageQuizScore: number;
    securityAwarenessScore: number;
  };
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light',
      },
    },
    stats: {
      totalScans: {
        type: Number,
        default: 0,
      },
      scamsDetected: {
        type: Number,
        default: 0,
      },
      quizzesTaken: {
        type: Number,
        default: 0,
      },
      averageQuizScore: {
        type: Number,
        default: 0,
      },
      securityAwarenessScore: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster email lookups
userSchema.index({ email: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
