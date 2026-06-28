import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { QuizResult } from './QuizResult';

describe('QuizResult Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid quiz result with all required fields', () => {
      const validQuizResult = new QuizResult({
        userId: new mongoose.Types.ObjectId(),
        quizId: 'phishing-basics-101',
        score: 8,
        totalQuestions: 10,
        answers: [
          { questionId: 'q1', selectedAnswer: 2, correct: true },
          { questionId: 'q2', selectedAnswer: 1, correct: true },
          { questionId: 'q3', selectedAnswer: 3, correct: false },
        ],
        completedAt: new Date(),
        timeSpent: 180,
      });

      const error = validQuizResult.validateSync();
      expect(error).toBeUndefined();
      expect(validQuizResult.quizId).toBe('phishing-basics-101');
      expect(validQuizResult.score).toBe(8);
      expect(validQuizResult.answers).toHaveLength(3);
    });

    it('should reject quiz result without userId', () => {
      const invalidQuizResult = new QuizResult({
        quizId: 'test-quiz',
        score: 5,
        totalQuestions: 10,
        answers: [],
        timeSpent: 120,
      });

      const error = invalidQuizResult.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors.userId).toBeDefined();
    });

    it('should reject quiz result without quizId', () => {
      const invalidQuizResult = new QuizResult({
        userId: new mongoose.Types.ObjectId(),
        score: 5,
        totalQuestions: 10,
        answers: [],
        timeSpent: 120,
      });

      const error = invalidQuizResult.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors.quizId).toBeDefined();
    });

    it('should reject quiz result with negative score', () => {
      const invalidQuizResult = new QuizResult({
        userId: new mongoose.Types.ObjectId(),
        quizId: 'test-quiz',
        score: -5,
        totalQuestions: 10,
        answers: [],
        timeSpent: 120,
      });

      const error = invalidQuizResult.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors.score).toBeDefined();
    });

    it('should reject quiz result with totalQuestions less than 1', () => {
      const invalidQuizResult = new QuizResult({
        userId: new mongoose.Types.ObjectId(),
        quizId: 'test-quiz',
        score: 0,
        totalQuestions: 0,
        answers: [],
        timeSpent: 120,
      });

      const error = invalidQuizResult.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors.totalQuestions).toBeDefined();
    });

    it('should reject quiz result with negative timeSpent', () => {
      const invalidQuizResult = new QuizResult({
        userId: new mongoose.Types.ObjectId(),
        quizId: 'test-quiz',
        score: 5,
        totalQuestions: 10,
        answers: [],
        timeSpent: -10,
      });

      const error = invalidQuizResult.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors.timeSpent).toBeDefined();
    });

    it('should set default completedAt if not provided', () => {
      const quizResult = new QuizResult({
        userId: new mongoose.Types.ObjectId(),
        quizId: 'test-quiz',
        score: 7,
        totalQuestions: 10,
        answers: [],
        timeSpent: 150,
      });

      const error = quizResult.validateSync();
      expect(error).toBeUndefined();
      expect(quizResult.completedAt).toBeDefined();
      expect(quizResult.completedAt).toBeInstanceOf(Date);
    });

    it('should accept quiz result with empty answers array', () => {
      const quizResult = new QuizResult({
        userId: new mongoose.Types.ObjectId(),
        quizId: 'test-quiz',
        score: 0,
        totalQuestions: 5,
        answers: [],
        timeSpent: 60,
      });

      const error = quizResult.validateSync();
      expect(error).toBeUndefined();
      expect(quizResult.answers).toEqual([]);
    });

    it('should accept quiz result with multiple answers', () => {
      const quizResult = new QuizResult({
        userId: new mongoose.Types.ObjectId(),
        quizId: 'advanced-scams',
        score: 9,
        totalQuestions: 10,
        answers: [
          { questionId: 'q1', selectedAnswer: 0, correct: true },
          { questionId: 'q2', selectedAnswer: 2, correct: true },
          { questionId: 'q3', selectedAnswer: 1, correct: false },
          { questionId: 'q4', selectedAnswer: 3, correct: true },
          { questionId: 'q5', selectedAnswer: 0, correct: true },
        ],
        timeSpent: 300,
      });

      const error = quizResult.validateSync();
      expect(error).toBeUndefined();
      expect(quizResult.answers).toHaveLength(5);
      expect(quizResult.answers[0].questionId).toBe('q1');
      expect(quizResult.answers[0].correct).toBe(true);
    });
  });

  describe('Data Type Validation', () => {
    it('should enforce answer structure with required fields', () => {
      const quizResult = new QuizResult({
        userId: new mongoose.Types.ObjectId(),
        quizId: 'test-quiz',
        score: 5,
        totalQuestions: 10,
        answers: [
          { questionId: 'q1', selectedAnswer: 1, correct: true },
        ],
        timeSpent: 120,
      });

      const error = quizResult.validateSync();
      expect(error).toBeUndefined();
      expect(quizResult.answers[0]).toHaveProperty('questionId');
      expect(quizResult.answers[0]).toHaveProperty('selectedAnswer');
      expect(quizResult.answers[0]).toHaveProperty('correct');
    });

    it('should store score as number', () => {
      const quizResult = new QuizResult({
        userId: new mongoose.Types.ObjectId(),
        quizId: 'test-quiz',
        score: 8,
        totalQuestions: 10,
        answers: [],
        timeSpent: 180,
      });

      const error = quizResult.validateSync();
      expect(error).toBeUndefined();
      expect(typeof quizResult.score).toBe('number');
      expect(quizResult.score).toBe(8);
    });

    it('should store selectedAnswer as number in answers', () => {
      const quizResult = new QuizResult({
        userId: new mongoose.Types.ObjectId(),
        quizId: 'test-quiz',
        score: 1,
        totalQuestions: 1,
        answers: [
          { questionId: 'q1', selectedAnswer: 2, correct: true },
        ],
        timeSpent: 60,
      });

      const error = quizResult.validateSync();
      expect(error).toBeUndefined();
      expect(typeof quizResult.answers[0].selectedAnswer).toBe('number');
      expect(quizResult.answers[0].selectedAnswer).toBe(2);
    });

    it('should store correct as boolean in answers', () => {
      const quizResult = new QuizResult({
        userId: new mongoose.Types.ObjectId(),
        quizId: 'test-quiz',
        score: 1,
        totalQuestions: 2,
        answers: [
          { questionId: 'q1', selectedAnswer: 1, correct: true },
          { questionId: 'q2', selectedAnswer: 0, correct: false },
        ],
        timeSpent: 90,
      });

      const error = quizResult.validateSync();
      expect(error).toBeUndefined();
      expect(typeof quizResult.answers[0].correct).toBe('boolean');
      expect(quizResult.answers[0].correct).toBe(true);
      expect(quizResult.answers[1].correct).toBe(false);
    });
  });
});
