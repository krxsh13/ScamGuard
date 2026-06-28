import { ScanResult } from '../types/api';

type ScanPayload = {
  type: 'text' | 'url' | 'image';
  content: string;
  imageUrl?: string;
};

const URGENCY_KEYWORDS = [
  'urgent',
  'immediately',
  'now',
  'hurry',
  'asap',
  'expires',
  'limited time',
  'act now',
  'last chance',
  'final notice',
  'deadline',
  'today only',
];

const FINANCIAL_KEYWORDS = [
  'bank',
  'account',
  'payment',
  'credit card',
  'wire transfer',
  'bitcoin',
  'crypto',
  'refund',
  'prize',
  'lottery',
  'inheritance',
  'dollars',
  'cash',
  'claim',
  'reward',
  'tax',
  'irs',
  'verify account',
  'suspended account',
];

const EMOTIONAL_KEYWORDS = [
  'congratulations',
  'winner',
  'selected',
  'exclusive',
  'guaranteed',
  'risk-free',
  'trust me',
  'problem',
  'suspended',
  'locked',
  'unauthorized',
  'security alert',
  'verify identity',
  'family emergency',
  'click here',
  'open attachment',
];

const SHORTENER_DOMAINS = [
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'cutt.ly',
  'rebrand.ly',
  'shorturl.at',
];

function countMatches(text: string, keywords: string[]) {
  return keywords.reduce((count, keyword) => (
    text.includes(keyword) ? count + 1 : count
  ), 0);
}

function normalizedCue(matchCount: number, weight: number) {
  return Math.min(1, Number((matchCount * weight).toFixed(2)));
}

function isIpAddress(hostname: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

function analyzeUrl(rawInput: string) {
  const issues: string[] = [];

  try {
    const url = new URL(rawInput.startsWith('http') ? rawInput : `https://${rawInput}`);
    const host = url.hostname.toLowerCase();

    if (url.protocol === 'http:') {
      issues.push('Uses insecure HTTP');
    }

    if (isIpAddress(host)) {
      issues.push('Uses an IP address instead of a recognizable domain');
    }

    if (host.startsWith('xn--')) {
      issues.push('Uses an internationalized domain that may impersonate another site');
    }

    if (host.includes('@') || rawInput.includes('@')) {
      issues.push('Contains @ symbol in URL');
    }

    if ((host.match(/-/g) || []).length >= 3) {
      issues.push('Domain contains many hyphens');
    }

    if (SHORTENER_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
      issues.push('Uses a URL shortener');
    }

    if (url.search.length > 120) {
      issues.push('Contains a long tracking query');
    }
  } catch {
    issues.push('URL could not be parsed cleanly');
  }

  return {
    isSuspicious: issues.length > 0,
    issues,
  };
}

export function analyzeLocally(payload: ScanPayload): ScanResult {
  const now = new Date().toISOString();
  const content = (payload.imageUrl || payload.content).trim();
  const text = content.toLowerCase();
  const detectedPatterns: string[] = [];

  const urgency = normalizedCue(countMatches(text, URGENCY_KEYWORDS), 0.22);
  const financialPressure = normalizedCue(countMatches(text, FINANCIAL_KEYWORDS), 0.18);
  const emotionalManipulation = normalizedCue(countMatches(text, EMOTIONAL_KEYWORDS), 0.18);

  let riskScore = Math.round(
    urgency * 22 +
    financialPressure * 28 +
    emotionalManipulation * 24
  );

  if (urgency >= 0.35) {
    detectedPatterns.push('Urgency tactics detected');
  }

  if (financialPressure >= 0.35) {
    detectedPatterns.push('Financial pressure detected');
  }

  if (emotionalManipulation >= 0.35) {
    detectedPatterns.push('Emotional manipulation detected');
  }

  if (/\b(password|passcode|pin|otp|ssn|social security|seed phrase)\b/.test(text)) {
    riskScore += 24;
    detectedPatterns.push('Sensitive information request');
  }

  if (/(verify|confirm|update).{0,30}(account|identity|payment|billing)/.test(text)) {
    riskScore += 20;
    detectedPatterns.push('Account verification request');
  }

  if (/(winner|prize|lottery|congratulations|selected).{0,40}(claim|reward|cash|money|gift)/.test(text)) {
    riskScore += 20;
    detectedPatterns.push('Prize or reward scam indicators');
  }

  if (/(bitcoin|crypto|gift card|wire transfer|western union|zelle|venmo|cashapp)/.test(text)) {
    riskScore += 16;
    detectedPatterns.push('High-risk payment method mentioned');
  }

  const threatIntelligence: ScanResult['threatIntelligence'] = {};

  if (payload.type === 'url' || /^https?:\/\//i.test(content) || /\b[a-z0-9.-]+\.[a-z]{2,}\b/i.test(content)) {
    const urlAnalysis = analyzeUrl(content);
    threatIntelligence.urlAnalysis = urlAnalysis;

    if (urlAnalysis.isSuspicious) {
      riskScore += Math.min(28, urlAnalysis.issues.length * 10);
      detectedPatterns.push('Suspicious URL characteristics detected');
    }
  }

  if (payload.type === 'image') {
    detectedPatterns.push('Image URL checked without OCR because the backend API is unavailable');
    riskScore += 5;
  }

  riskScore = Math.min(100, Math.max(0, riskScore));

  const riskLevel: ScanResult['riskLevel'] =
    riskScore >= 70 ? 'high' : riskScore >= 30 ? 'medium' : 'low';

  const confidence = Math.min(
    96,
    Math.max(58, Math.round(62 + detectedPatterns.length * 7 + riskScore * 0.12))
  );

  return {
    id: `local-${Date.now().toString(36)}`,
    status: 'completed',
    type: payload.type,
    content,
    riskScore,
    riskLevel,
    confidence,
    isScam: riskScore >= 50,
    detectedPatterns: Array.from(new Set(detectedPatterns)),
    linguisticCues: {
      urgency,
      financialPressure,
      emotionalManipulation,
    },
    threatIntelligence,
    lowConfidenceWarning: 'Local heuristic analysis was used because the backend API was unavailable.',
    processingTimeMs: 0,
    createdAt: now,
    completedAt: now,
  };
}
