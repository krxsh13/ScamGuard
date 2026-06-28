import { z } from 'zod';

// Report schemas
export const createReportSchema = z.object({
  scanId: z.string().min(1, 'Scan ID is required'),
  reportType: z.enum(['false_positive', 'missed_scam', 'other'], {
    errorMap: () => ({ message: 'Report type must be false_positive, missed_scam, or other' })
  }),
  details: z.string()
    .min(10, 'Details must be at least 10 characters')
    .max(5000, 'Details must not exceed 5000 characters'),
}).strict();
