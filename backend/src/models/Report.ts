import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'phone' | 'email' | 'url' | 'message';
  content: string;
  scamType: string[];
  description: string;
  evidence?: string[];
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  reportCount: number;
  reporters: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['phone', 'email', 'url', 'message'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    scamType: {
      type: [String],
      required: true,
      validate: {
        validator: function (v: string[]) {
          return v && v.length > 0;
        },
        message: 'At least one scam type must be specified',
      },
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000,
    },
    evidence: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    reportCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    reporters: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient report search and aggregation
reportSchema.index({ content: 1, type: 1 });

// Index for filtering by status and date
reportSchema.index({ status: 1, createdAt: -1 });

// Index for finding high-risk reports
reportSchema.index({ reportCount: -1 });

// Index for analytics queries
reportSchema.index({ scamType: 1, createdAt: -1 });

export const Report = mongoose.model<IReport>('Report', reportSchema);
