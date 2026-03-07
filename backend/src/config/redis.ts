import { createClient } from 'redis';
import { env } from './env.js';
import { logger } from './logger.js';

export type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;

export async function connectRedis(): Promise<RedisClient> {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = createClient({
      url: env.REDIS_URL,
      password: env.REDIS_PASSWORD,
    });

    redisClient.on('error', (error) => {
      logger.error('Redis client error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('end', () => {
      logger.warn('Redis client disconnected');
    });

    await redisClient.connect();
    
    return redisClient;
  } catch (error) {
    logger.error('Redis connection error:', error);
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis disconnected');
    } catch (error) {
      logger.error('Redis disconnection error:', error);
      throw error;
    }
  }
}

export function getRedisClient(): RedisClient {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
}

process.on('SIGINT', async () => {
  await disconnectRedis();
});
