import mongoose, { Document, Schema } from 'mongoose';

export interface IQuizResult extends Document {
  userId: mongoose.Types.ObjectId;
  quizId: string;
  score: number;
  totalQuestions: number;
  answers: {
    questionId: string;
    selectedAnswer: number;
    correct: boolean;
  }[];
  completedAt: Date;
  timeSpent: number;
}

const quizResultSchema = new Schema<IQuizResult>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    quizId: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },
    answers: [
      {
        questionId: {
          type: String,
          required: true,
        },
        selectedAnswer: {
          type: Number,
          required: true,
        },
        correct: {
          type: Boolean,
          required: true,
        },
      },
    ],
    completedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    timeSpent: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient user quiz history queries
quizResultSchema.index({ userId: 1, completedAt: -1 });

// Index for analytics queries by quiz type
quizResultSchema.index({ quizId: 1, completedAt: -1 });

export const QuizResult = mongoose.model<IQuizResult>('QuizResult', quizResultSchema);
