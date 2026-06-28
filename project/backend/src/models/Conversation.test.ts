import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { Conversation } from './Conversation';

describe('Conversation Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid conversation with all required fields', () => {
      const validConversation = new Conversation({
        userId: new mongoose.Types.ObjectId(),
        messages: [
          {
            role: 'user',
            content: 'What is phishing?',
            timestamp: new Date(),
          },
          {
            role: 'assistant',
            content: 'Phishing is a type of cyber attack...',
            timestamp: new Date(),
          },
        ],
      });

      const error = validConversation.validateSync();
      expect(error).toBeUndefined();
      expect(validConversation.messages).toHaveLength(2);
      expect(validConversation.messages[0].role).toBe('user');
    });

    it('should reject conversation without userId', () => {
      const invalidConversation = new Conversation({
        messages: [
          {
            role: 'user',
            content: 'Test message',
            timestamp: new Date(),
          },
        ],
      });

      const error = invalidConversation.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors.userId).toBeDefined();
    });

    it('should accept conversation with empty messages array', () => {
      const conversation = new Conversation({
        userId: new mongoose.Types.ObjectId(),
        messages: [],
      });

      const error = conversation.validateSync();
      expect(error).toBeUndefined();
      expect(conversation.messages).toEqual([]);
    });

    it('should set default timestamp for messages if not provided', () => {
      const conversation = new Conversation({
        userId: new mongoose.Types.ObjectId(),
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
      });

      const error = conversation.validateSync();
      expect(error).toBeUndefined();
      expect(conversation.messages[0].timestamp).toBeDefined();
      expect(conversation.messages[0].timestamp).toBeInstanceOf(Date);
    });

    it('should accept multiple messages in conversation', () => {
      const conversation = new Conversation({
        userId: new mongoose.Types.ObjectId(),
        messages: [
          { role: 'user', content: 'What is a scam?', timestamp: new Date() },
          { role: 'assistant', content: 'A scam is...', timestamp: new Date() },
          { role: 'user', content: 'How can I protect myself?', timestamp: new Date() },
          { role: 'assistant', content: 'You can protect yourself by...', timestamp: new Date() },
        ],
      });

      const error = conversation.validateSync();
      expect(error).toBeUndefined();
      expect(conversation.messages).toHaveLength(4);
    });

    it('should reject message with invalid role', () => {
      const invalidConversation = new Conversation({
        userId: new mongoose.Types.ObjectId(),
        messages: [
          {
            role: 'invalid' as any,
            content: 'Test message',
            timestamp: new Date(),
          },
        ],
      });

      const error = invalidConversation.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors['messages.0.role']).toBeDefined();
    });
  });

  describe('Data Type Validation', () => {
    it('should enforce role enum values', () => {
      const conversation = new Conversation({
        userId: new mongoose.Types.ObjectId(),
        messages: [
          { role: 'user', content: 'User message', timestamp: new Date() },
          { role: 'assistant', content: 'Assistant response', timestamp: new Date() },
        ],
      });

      const error = conversation.validateSync();
      expect(error).toBeUndefined();
      expect(['user', 'assistant']).toContain(conversation.messages[0].role);
      expect(['user', 'assistant']).toContain(conversation.messages[1].role);
    });

    it('should store messages as array', () => {
      const conversation = new Conversation({
        userId: new mongoose.Types.ObjectId(),
        messages: [
          { role: 'user', content: 'Test', timestamp: new Date() },
        ],
      });

      const error = conversation.validateSync();
      expect(error).toBeUndefined();
      expect(Array.isArray(conversation.messages)).toBe(true);
    });

    it('should store content as string', () => {
      const conversation = new Conversation({
        userId: new mongoose.Types.ObjectId(),
        messages: [
          { role: 'user', content: 'This is a test message', timestamp: new Date() },
        ],
      });

      const error = conversation.validateSync();
      expect(error).toBeUndefined();
      expect(typeof conversation.messages[0].content).toBe('string');
      expect(conversation.messages[0].content).toBe('This is a test message');
    });

    it('should store timestamp as Date', () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      const conversation = new Conversation({
        userId: new mongoose.Types.ObjectId(),
        messages: [
          { role: 'user', content: 'Test', timestamp: testDate },
        ],
      });

      const error = conversation.validateSync();
      expect(error).toBeUndefined();
      expect(conversation.messages[0].timestamp).toBeInstanceOf(Date);
    });

    it('should maintain message order', () => {
      const conversation = new Conversation({
        userId: new mongoose.Types.ObjectId(),
        messages: [
          { role: 'user', content: 'First message', timestamp: new Date() },
          { role: 'assistant', content: 'Second message', timestamp: new Date() },
          { role: 'user', content: 'Third message', timestamp: new Date() },
        ],
      });

      const error = conversation.validateSync();
      expect(error).toBeUndefined();
      expect(conversation.messages[0].content).toBe('First message');
      expect(conversation.messages[1].content).toBe('Second message');
      expect(conversation.messages[2].content).toBe('Third message');
    });

    it('should handle long conversation content', () => {
      const longContent = 'a'.repeat(5000);
      const conversation = new Conversation({
        userId: new mongoose.Types.ObjectId(),
        messages: [
          { role: 'user', content: longContent, timestamp: new Date() },
        ],
      });

      const error = conversation.validateSync();
      expect(error).toBeUndefined();
      expect(conversation.messages[0].content).toBe(longContent);
      expect(conversation.messages[0].content.length).toBe(5000);
    });
  });
});
