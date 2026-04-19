/**
 * Shared API types and interfaces for the frontend
 */

/**
 * User data structure
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Authentication response with tokens
 */
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

/**
 * Scan result data structure
 */
export interface ScanResult {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  type: 'text' | 'url' | 'image';
  content: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  isScam: boolean;
  detectedPatterns: string[];
  linguisticCues: {
    urgency: number;
    financialPressure: number;
    emotionalManipulation: number;
  };
  threatIntelligence?: {
    urlAnalysis?: {
      isSuspicious: boolean;
      issues: string[];
    };
    googleSafeBrowsing?: {
      isMalicious: boolean;
      threatTypes: string[];
    };
    virusTotal?: {
      positives: number;
      total: number;
    };
  };
  lowConfidenceWarning?: string;
  processingTimeMs: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Report data structure
 */
export interface Report {
  id: string;
  userId: string;
  scanId: string;
  title: string;
  description: string;
  category: 'phishing' | 'malware' | 'fraud' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'submitted' | 'investigating' | 'resolved' | 'rejected';
  evidence: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Quiz data structure
 */
export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Quiz question structure
 */
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

/**
 * Quiz result structure
 */
export interface QuizResult {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  answers: number[];
  completedAt: string;
}

/**
 * Analytics data structure
 */
export interface AnalyticsData {
  totalScans: number;
  totalReports: number;
  averageRiskScore: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  topPatterns: Array<{
    pattern: string;
    count: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    scans: number;
    reports: number;
  }>;
}

/**
 * Conversation (Chat) data structure
 */
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Message structure
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
