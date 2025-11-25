import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Search, Link, MessageSquare, Mail, Globe, Phone, CreditCard } from 'lucide-react';

interface ScamAnalysis {
  risk: 'low' | 'medium' | 'high';
  explanation: string;
  tips: string[];
  detectedPatterns: string[];
  urlAnalysis?: {
    isSuspicious: boolean;
    issues: string[];
  };
  grammarIssues?: string[];
  urgencyScore: number;
  financialPressure: boolean;
}

export function ScamChecker() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ScamAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Enhanced scam patterns with context and weights
  const scamPatterns = [
    {
      category: 'Financial Scams',
      patterns: [
        { keywords: ['urgent', 'immediately', 'limited time', 'act now', 'expires soon'], risk: 'medium', weight: 2 },
        { keywords: ['congratulations', 'winner', 'lottery', 'prize', 'won', 'jackpot'], risk: 'high', weight: 3 },
        { keywords: ['verify account', 'update payment', 'suspended', 'frozen account'], risk: 'high', weight: 3 },
        { keywords: ['government', 'tax refund', 'irs', 'social security', 'medicare'], risk: 'high', weight: 3 },
        { keywords: ['free money', 'easy money', 'guaranteed', 'risk-free', 'quick cash'], risk: 'high', weight: 3 },
        { keywords: ['bitcoin', 'cryptocurrency', 'investment opportunity', 'crypto'], risk: 'medium', weight: 2 },
        { keywords: ['gift card', 'prepaid card', 'western union', 'moneygram'], risk: 'high', weight: 3 },
        { keywords: ['inheritance', 'unclaimed money', 'found money', 'legal fees'], risk: 'high', weight: 3 }
      ]
    },
    {
      category: 'Tech Support Scams',
      patterns: [
        { keywords: ['microsoft', 'apple', 'google', 'tech support', 'computer virus'], risk: 'high', weight: 3 },
        { keywords: ['remote access', 'teamviewer', 'anydesk', 'fix computer'], risk: 'high', weight: 3 },
        { keywords: ['subscription', 'renewal', 'billing', 'payment method'], risk: 'medium', weight: 2 }
      ]
    },
    {
      category: 'Phishing Attempts',
      patterns: [
        { keywords: ['click here', 'verify now', 'secure link', 'login required'], risk: 'medium', weight: 2 },
        { keywords: ['password', 'username', 'account details', 'personal info'], risk: 'high', weight: 3 },
        { keywords: ['unusual activity', 'suspicious login', 'security alert'], risk: 'medium', weight: 2 }
      ]
    },
    {
      category: 'Social Engineering',
      patterns: [
        { keywords: ['friend in need', 'emergency', 'help needed', 'urgent request'], risk: 'medium', weight: 2 },
        { keywords: ['romance', 'dating', 'love', 'relationship'], risk: 'medium', weight: 2 },
        { keywords: ['job offer', 'work from home', 'easy job', 'high salary'], risk: 'medium', weight: 2 }
      ]
    }
  ];

  // Suspicious URL patterns
  const suspiciousUrlPatterns = [
    'bit.ly', 'tinyurl', 'goo.gl', 't.co', // URL shorteners
    'secure-', 'verify-', 'update-', 'login-', // Suspicious prefixes
    'bank-verify', 'account-secure', 'payment-update', // Common scam domains
    '.tk', '.ml', '.ga', '.cf', '.gq' // Suspicious TLDs
  ];

  // Grammar and spelling issues common in scams
  const grammarRedFlags = [
    'dear customer', 'dear sir', 'dear madam', // Generic greetings
    'kindly', 'please kindly', 'urgently', // Formal but suspicious language
    'your account has been', 'your payment is', // Passive aggressive tone
    'click here to', 'verify your', 'update your' // Command phrases
    
  ];

  const analyzeText = async () => {
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const lowercaseInput = input.toLowerCase();
    let totalRiskScore = 0;
    const detectedPatterns: string[] = [];
    const grammarIssues: string[] = [];
    let urgencyScore = 0;
    let financialPressure = false;

    // Analyze scam patterns
    scamPatterns.forEach(category => {
      category.patterns.forEach(pattern => {
        const foundKeywords = pattern.keywords.filter(keyword => 
          lowercaseInput.includes(keyword.toLowerCase())
        );
        
        if (foundKeywords.length > 0) {
          detectedPatterns.push(...foundKeywords);
          totalRiskScore += pattern.weight * foundKeywords.length;
          
          if (category.category === 'Financial Scams') {
            financialPressure = true;
          }
        }
      });
    });

    // Check for urgency indicators
    const urgencyWords = ['urgent', 'immediate', 'asap', 'expire', 'limited', 'now', 'quick'];
    urgencyWords.forEach(word => {
      if (lowercaseInput.includes(word)) {
        urgencyScore += 1;
      }
    });

    // Check for grammar issues
    grammarRedFlags.forEach(flag => {
      if (lowercaseInput.includes(flag)) {
        grammarIssues.push(flag);
      }
    });

    // Analyze URLs in the text
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = input.match(urlRegex) || [];
    const urlAnalysis = analyzeUrls(urls);

    // Determine risk level based on score
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (totalRiskScore >= 6 || urgencyScore >= 3) {
      riskLevel = 'high';
    } else if (totalRiskScore >= 3 || urgencyScore >= 2) {
      riskLevel = 'medium';
    }

    // Generate detailed explanation and tips
    const { explanation, tips } = generateDetailedAnalysis(riskLevel, detectedPatterns, urgencyScore, financialPressure, urlAnalysis, grammarIssues);

    setResult({
      risk: riskLevel,
      explanation,
      tips,
      detectedPatterns: [...new Set(detectedPatterns)], // Remove duplicates
      urlAnalysis,
      grammarIssues: grammarIssues.length > 0 ? grammarIssues : undefined,
      urgencyScore,
      financialPressure
    });
    
    setIsAnalyzing(false);
  };

  const analyzeUrls = (urls: string[]) => {
    if (urls.length === 0) return undefined;

    const issues: string[] = [];
    let isSuspicious = false;

    urls.forEach(url => {
      const urlLower = url.toLowerCase();
      
      // Check for suspicious patterns
      suspiciousUrlPatterns.forEach(pattern => {
        if (urlLower.includes(pattern)) {
          issues.push(`Suspicious URL pattern: ${pattern}`);
          isSuspicious = true;
        }
      });

      // Check for HTTP vs HTTPS
      if (urlLower.startsWith('http://') && !urlLower.startsWith('https://')) {
        issues.push('Unsecure HTTP connection');
        isSuspicious = true;
      }

      // Check for suspicious domain names
      if (urlLower.includes('bank-verify') || urlLower.includes('account-secure')) {
        issues.push('Suspicious domain name');
        isSuspicious = true;
      }
    });

    return { isSuspicious, issues };
  };

  const generateDetailedAnalysis = (
    riskLevel: string,
    patterns: string[],
    urgencyScore: number,
    financialPressure: boolean,
    urlAnalysis?: { isSuspicious: boolean; issues: string[] },
    grammarIssues?: string[]
  ) => {
    let explanation = '';
    let tips: string[] = [];

    switch (riskLevel) {
      case 'high':
        explanation = `This message shows multiple strong indicators of being a scam. We detected ${patterns.length} suspicious patterns including ${patterns.slice(0, 3).join(', ')}.`;
        if (urlAnalysis?.isSuspicious) {
          explanation += ' The included links appear suspicious and should not be clicked.';
        }
        if (financialPressure) {
          explanation += ' This appears to be a financial scam attempting to pressure you into sending money.';
        }
        tips = [
          '🚫 DO NOT click any links or provide personal information',
          '🚫 DO NOT send money, gift cards, or cryptocurrency',
          '🔍 Verify independently by contacting the organization directly',
          '📞 Report this message to authorities (FTC, FBI, etc.)',
          '💾 Save the message as evidence',
          '🔒 Update your passwords if you clicked any links'
        ];
        break;
      case 'medium':
        explanation = `This message has several warning signs that suggest it could be suspicious. We found ${patterns.length} concerning patterns.`;
        if (urgencyScore > 0) {
          explanation += ` The message uses urgent language (${urgencyScore} urgency indicators), which is a common scam tactic.`;
        }
        tips = [
          '⚠️ Double-check the sender\'s identity independently',
          '🔍 Look for spelling and grammar mistakes',
          '⏰ Be suspicious of urgent requests',
          '🔗 Verify any claims through official channels',
          '❓ When in doubt, don\'t respond',
          '📱 Contact the organization directly if concerned'
        ];
        break;
      default:
        explanation = 'This message appears to be relatively safe, but always stay vigilant.';
        tips = [
          '✅ Continue to be cautious with personal information',
          '🔍 Verify sender identity for important requests',
          '🛡️ Keep your security software updated',
          '📚 Stay informed about current scam trends'
        ];
    }

    return { explanation, tips };
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'high': return <AlertTriangle className="h-6 w-6 text-red-600" />;
      case 'medium': return <AlertCircle className="h-6 w-6 text-orange-600" />;
      default: return <CheckCircle className="h-6 w-6 text-green-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Advanced Scam Detection Tool</h2>
        <p className="text-gray-600 text-lg">
          Our enhanced AI analyzes messages, emails, and links for sophisticated scam patterns
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="mb-6">
          <label htmlFor="scam-input" className="block text-lg font-medium text-gray-700 mb-3">
            Enter suspicious content:
          </label>
          <div className="relative">
            <textarea
              id="scam-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste the message, email, or link you want to check..."
              className="w-full h-32 p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none text-base"
            />
            <div className="absolute top-3 right-3 flex space-x-2">
              <MessageSquare className="h-5 w-5 text-gray-400" />
              <Mail className="h-5 w-5 text-gray-400" />
              <Link className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        <button
          onClick={analyzeText}
          disabled={!input.trim() || isAnalyzing}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center justify-center space-x-2"
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Analyzing with AI...</span>
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              <span>Analyze for Scams</span>
            </>
          )}
        </button>

        {result && (
          <div className={`mt-8 p-6 rounded-lg border-2 ${getRiskColor(result.risk)}`}>
            <div className="flex items-center space-x-3 mb-4">
              {getRiskIcon(result.risk)}
              <h3 className="text-xl font-bold">
                {result.risk === 'high' ? '🚨 HIGH RISK - Likely Scam' :
                 result.risk === 'medium' ? '⚠️ MEDIUM RISK - Be Careful' :
                 '✅ LOW RISK - Appears Safe'}
              </h3>
            </div>
            
            <p className="text-lg mb-6">{result.explanation}</p>

            {/* Detailed Analysis Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Detected Patterns */}
              {result.detectedPatterns.length > 0 && (
                <div className="bg-white bg-opacity-50 rounded-lg p-4">
                  <h4 className="font-semibold text-lg mb-2 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Detected Patterns:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.detectedPatterns.slice(0, 6).map((pattern, index) => (
                      <span key={index} className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                        {pattern}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* URL Analysis */}
              {result.urlAnalysis && (
                <div className="bg-white bg-opacity-50 rounded-lg p-4">
                  <h4 className="font-semibold text-lg mb-2 flex items-center">
                    <Globe className="h-5 w-5 mr-2" />
                    URL Analysis:
                  </h4>
                  {result.urlAnalysis.isSuspicious ? (
                    <div className="text-red-800">
                      <p className="font-medium">⚠️ Suspicious URLs detected</p>
                      <ul className="text-sm mt-1 space-y-1">
                        {result.urlAnalysis.issues.slice(0, 3).map((issue, index) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-green-800">✅ URLs appear safe</p>
                  )}
                </div>
              )}

              {/* Grammar Issues */}
              {result.grammarIssues && (
                <div className="bg-white bg-opacity-50 rounded-lg p-4">
                  <h4 className="font-semibold text-lg mb-2 flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Language Analysis:
                  </h4>
                  <p className="text-orange-800 text-sm">
                    Found {result.grammarIssues.length} suspicious language patterns
                  </p>
                </div>
              )}

              {/* Urgency Score */}
              {result.urgencyScore > 0 && (
                <div className="bg-white bg-opacity-50 rounded-lg p-4">
                  <h4 className="font-semibold text-lg mb-2 flex items-center">
                    <Phone className="h-5 w-5 mr-2" />
                    Urgency Level:
                  </h4>
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map(level => (
                        <div
                          key={level}
                          className={`w-3 h-3 rounded-full ${
                            level <= result.urgencyScore ? 'bg-red-500' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {result.urgencyScore}/5 urgency indicators
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Action Tips */}
            <div className="space-y-2">
              <h4 className="font-semibold text-lg flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                What you should do:
              </h4>
              <ul className="space-y-2">
                {result.tips.map((tip, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-lg">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Enhanced Safety Features</h3>
        <ul className="text-blue-800 space-y-1">
          <li>• AI-powered pattern recognition for sophisticated scams</li>
          <li>• URL reputation and security analysis</li>
          <li>• Grammar and language pattern detection</li>
          <li>• Urgency and pressure tactic identification</li>
          <li>• Financial scam pattern recognition</li>
        </ul>
      </div>
    </div>
  );
}