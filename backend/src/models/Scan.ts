import mongoose, { Document, Schema } from 'mongoose';

export interface IScan extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'text' | 'url' | 'image';
  content: string;
  imageUrl?: string;
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
  processingTime: number;
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
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient user scan history queries
scanSchema.index({ userId: 1, createdAt: -1 });

// Index for analytics queries
scanSchema.index({ 'results.riskLevel': 1, createdAt: -1 });

export const Scan = mongoose.model<IScan>('Scan', scanSchema);
