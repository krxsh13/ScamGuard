import { z } from 'zod';

// Scan schemas
export const submitScanSchema = z.object({
  type: z.enum(['text', 'url', 'image'], {
    errorMap: () => ({ message: 'Type must be text, url, or image' })
  }),
  content: z.string()
    .min(1, 'Content is required')
    .max(10000, 'Content must not exceed 10000 characters'),
  imageUrl: z.string().url('Invalid image URL').optional(),
}).strict();
