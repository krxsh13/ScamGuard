import mongoose, { Document, Schema } from 'mongoose';

export interface IScan extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'text' | 'url' | 'image';
  content: string;
  imageUrl?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error?: string;
  results: {
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    confidence: number;
    aiPrediction: {
      isScam: boolean;
      probability: number;
      detectedPatterns: string[];
      linguisticCues: {
        urgency: number;
        financialPressure: number;
        emotionalManipulation: number;
      };
    };
    threatIntel?: {
      googleSafeBrowsing?: {
        isMalicious: boolean;
        threatTypes: string[];
        platformTypes: string[];
      };
      virusTotal?: {
        positives: number;
        total: number;
        scanDate: string;
        permalink: string;
      };
      phishTank?: {
        inDatabase: boolean;
        verified: boolean;
        verifiedAt: string;
      };
    };
    urlAnalysis?: {
      domain: string;
      isShortened: boolean;
      hasSSL: boolean;
      domainAge: number;
      suspiciousPatterns: string[];
    };
  };
  createdAt: Date;
  updatedAt: Date;
  processingTime: number;
  deletedAt?: Date | null;
}

const scanSchema = new Schema<IScan>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'url', 'image'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    error: {
      type: String,
    },
    results: {
      riskScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true,
      },
      confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      aiPrediction: {
        isScam: {
          type: Boolean,
          required: true,
        },
        probability: {
          type: Number,
          required: true,
          min: 0,
          max: 1,
        },
        detectedPatterns: {
          type: [String],
          default: [],
        },
        linguisticCues: {
          urgency: {
            type: Number,
            required: true,
            min: 0,
            max: 1,
          },
          financialPressure: {
            type: Number,
            required: true,
            min: 0,
            max: 1,
          },
          emotionalManipulation: {
            type: Number,
            required: true,
            min: 0,
            max: 1,
          },
        },
      },
      threatIntel: {
        googleSafeBrowsing: {
          isMalicious: Boolean,
          threatTypes: [String],
          platformTypes: [String],
        },
        virusTotal: {
          positives: Number,
          total: Number,
          scanDate: String,
          permalink: String,
        },
        phishTank: {
          inDatabase: Boolean,
          verified: Boolean,
          verifiedAt: String,
        },
      },
      urlAnalysis: {
        domain: String,
        isShortened: Boolean,
        hasSSL: Boolean,
        domainAge: Number,
        suspiciousPatterns: [String],
      },
    },
    processingTime: {
      type: Number,
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient user scan history queries (exclude soft-deleted)
scanSchema.index({ userId: 1, createdAt: -1, deletedAt: 1 });

// Index for analytics queries
scanSchema.index({ 'results.riskLevel': 1, createdAt: -1 });

// Post-save hook to update user statistics
scanSchema.post('save', async function (doc: IScan) {
  try {
    const { User } = await import('./User.js');
    
    // Increment total scans
    await User.findByIdAndUpdate(
      doc.userId,
      { $inc: { 'stats.totalScans': 1 } },
      { new: false }
    );

    // Increment scams detected if marked as scam
    if (doc.results?.aiPrediction?.isScam || doc.results?.riskLevel === 'high') {
      await User.findByIdAndUpdate(
        doc.userId,
        { $inc: { 'stats.scamsDetected': 1 } },
        { new: false }
      );
    }
  } catch (error) {
    console.error('Failed to update user statistics:', error);
    // Don't throw - stats update failure shouldn't block scan saving
  }
});

export const Scan = mongoose.model<IScan>('Scan', scanSchema);
