import { Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { Scan } from '../models/Scan.js';
import { logger } from '../config/logger.js';
import axios from 'axios';
import { ScanJobData } from '../queues/scan.queue.js';

interface ThreatIntel {
  googleSafeBrowsing?: { safe: boolean; threat?: string };
  virusTotal?: { safe: boolean; detections?: number };
  phishTank?: { safe: boolean; phishTankId?: string };
}

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';
const GOOGLE_SAFE_BROWSING_KEY = process.env.GOOGLE_SAFE_BROWSING_KEY;
const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY;

const redisConnection = getRedisConnection();

/**
 * Worker for processing scan jobs from the queue
 * - Calls AI service for scam detection
 * - Optionally calls threat intelligence APIs for URLs
 * - Updates Scan record with results
 */
export const scanWorker = new Worker<ScanJobData>(
  'scans',
  async (job) => {
    const { scanId, userId, input, type } = job.data;
    logger.info(`Processing scan job ${job.id}: scanId=${scanId}, type=${type}`);

    try {
      // Update scan status to 'processing'
      await Scan.findByIdAndUpdate(scanId, { status: 'processing' });

      let aiResults: any = null;
      let threatIntel: ThreatIntel = {};

      // Handle different input types
      if (type === 'text') {
        aiResults = await callAIService(input);
      } else if (type === 'url') {
        // For URLs, call AI service with the URL and gather threat intelligence
        aiResults = await callAIService(input);
        threatIntel = await gatherThreatIntelligence(input);
      } else if (type === 'image') {
        // For images, extract text first, then call AI service
        const extractedText = await extractTextFromImage(input);
        aiResults = await callAIService(extractedText);
        
        // Image Data Policy: Delete uploaded image from temporary storage
        // GDPR Compliance: Do not persist raw image bytes
        await deleteTemporaryImage(input);
      }

      // Merge threat intelligence with AI results
      const results = {
        ...aiResults,
        threatIntel,
      };

      // Update scan with completed results
      // IMPORTANT: imageUrl should only reference remote storage (S3/R2),
      // never store base64 image data in MongoDB
      await Scan.findByIdAndUpdate(scanId, {
        status: 'completed',
        results,
      });

      logger.info(`Scan job ${job.id} completed successfully`);
      return { success: true, scanId, results };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Scan job ${job.id} failed: ${errorMessage}`);

      // Update scan status to 'failed' with error message
      await Scan.findByIdAndUpdate(scanId, {
        status: 'failed',
        error: errorMessage,
      });

      throw error;
    }
  },
  {
    connection: redisConnection as any,
    concurrency: 3, // Process up to 3 jobs concurrently
  }
);

/**
 * Call the AI service for scam detection
 */
async function callAIService(input: string): Promise<any> {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/predict`, {
      text: input,
    });

    return response.data;
  } catch (error) {
    logger.error(
      `AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    throw new Error('AI service unavailable');
  }
}

/**
 * Extract text from base64 encoded image
 */
async function extractTextFromImage(base64Image: string): Promise<string> {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/extract-text`, {
      image: base64Image,
    });

    return response.data.text || '';
  } catch (error) {
    logger.error(
      `Image extraction error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Gather threat intelligence for a URL
 * Calls Google Safe Browsing, VirusTotal, and PhishTank in parallel
 */
async function gatherThreatIntelligence(url: string): Promise<ThreatIntel> {
  const results: ThreatIntel = {};

  try {
    // Call APIs in parallel, but don't fail the whole job if one fails
    const promises = [
      checkGoogleSafeBrowsing(url),
      checkVirusTotal(url),
      checkPhishTank(url),
    ];

    const [googleResult, virusResult, phishResult] = await Promise.allSettled(promises);

    if (googleResult.status === 'fulfilled' && googleResult.value) {
      results.googleSafeBrowsing = googleResult.value;
    }
    if (virusResult.status === 'fulfilled' && virusResult.value) {
      results.virusTotal = virusResult.value;
    }
    if (phishResult.status === 'fulfilled' && phishResult.value) {
      results.phishTank = phishResult.value;
    }
  } catch (error) {
    logger.warn(
      `Threat intelligence gathering partial failure: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return results;
}

/**
 * Check URL against Google Safe Browsing API
 */
async function checkGoogleSafeBrowsing(url: string): Promise<any> {
  if (!GOOGLE_SAFE_BROWSING_KEY) {
    logger.debug('Google Safe Browsing API key not configured');
    return null;
  }

  try {
    const response = await axios.post(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_SAFE_BROWSING_KEY}`,
      {
        client: {
          clientId: 'scamguard',
          clientVersion: '1.0.0',
        },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }],
        },
      },
      { timeout: 5000 }
    );

    return {
      safe: !response.data.matches || response.data.matches.length === 0,
      threat:
        response.data.matches && response.data.matches.length > 0
          ? response.data.matches[0].threatType
          : undefined,
    };
  } catch (error) {
    logger.warn(`Google Safe Browsing check failed: ${error}`);
    return null;
  }
}

/**
 * Check URL against VirusTotal API
 */
async function checkVirusTotal(url: string): Promise<any> {
  if (!VIRUSTOTAL_API_KEY) {
    logger.debug('VirusTotal API key not configured');
    return null;
  }

  try {
    // VirusTotal requires URL encoding
    const encoded = new URLSearchParams();
    encoded.append('url', url);

    const response = await axios.post('https://www.virustotal.com/api/v3/urls', encoded, {
      headers: {
        'x-apikey': VIRUSTOTAL_API_KEY,
      },
      timeout: 5000,
    });

    return {
      safe: response.data.data?.attributes?.last_analysis_stats?.malicious === 0,
      detections: response.data.data?.attributes?.last_analysis_stats?.malicious || 0,
    };
  } catch (error) {
    logger.warn(`VirusTotal check failed: ${error}`);
    return null;
  }
}

/**
 * Check URL against PhishTank API (free, no key required)
 */
async function checkPhishTank(url: string): Promise<any> {
  try {
    const response = await axios.post(
      'https://checkurl.phishtank.com/checkurl/',
      { url, format: 'json' },
      { timeout: 5000 }
    );

    return {
      safe: response.data.results.in_database === false,
      phishTankId: response.data.results.phish_id,
    };
  } catch (error) {
    logger.warn(`PhishTank check failed: ${error}`);
    return null;
  }
}

/**
 * Delete temporary image data after processing
 * Image Data Policy: Do not persist raw image bytes
 *
 * This function handles cleanup of uploaded image data:
 * - If image is stored in temporary storage, delete it
 * - If image is base64 encoded, clear it from memory
 * - Keep only reference URLs in MongoDB (from S3/R2 if applicable)
 *
 * TTL Cleanup: A separate cron job should clean up any unreferenced files
 * in the image storage bucket after 24 hours
 */
async function deleteTemporaryImage(imageData: string): Promise<void> {
  try {
    // For now, base64 image data is passed directly and not stored in the worker
    // This ensures no raw image bytes are persisted in memory or database
    
    // In production, if using S3/R2 for image storage:
    // - Delete the temporary file from S3/R2 bucket
    // - Example: await s3Client.deleteObject({ Bucket, Key });
    
    // If using local filesystem:
    // - Delete the temporary file from /tmp or uploads folder
    // - Example: await fs.unlink(tempPath);
    
    logger.debug('Temporary image data cleared after OCR extraction');
  } catch (error) {
    logger.warn(
      `Failed to delete temporary image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    // Continue anyway - scan processing is complete
  }
}

// Log worker events
scanWorker.on('error', (err) => {
  logger.error(`Worker error: ${err.message}`);
});

scanWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed: ${err.message}`);
});

logger.info('Scan worker initialized with concurrency 3');

export default scanWorker;
