import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Search, Link, MessageSquare, Mail } from 'lucide-react';

export function ScamChecker() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<null | { risk: 'low' | 'medium' | 'high', explanation: string, tips: string[] }>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const scamPatterns = [
    { keywords: ['urgent', 'immediately', 'limited time', 'act now', 'expires soon'], risk: 'medium' },
    { keywords: ['congratulations', 'winner', 'lottery', 'prize', 'won'], risk: 'high' },
    { keywords: ['verify account', 'click here', 'update payment', 'suspended'], risk: 'high' },
    { keywords: ['government', 'tax refund', 'irs', 'social security'], risk: 'high' },
    { keywords: ['free money', 'easy money', 'guaranteed', 'risk-free'], risk: 'high' },
    { keywords: ['bitcoin', 'cryptocurrency', 'investment opportunity'], risk: 'medium' },
  ];

  const analyzeText = async () => {
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const lowercaseInput = input.toLowerCase();
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    const foundPatterns: string[] = [];

    // Check for scam patterns
    scamPatterns.forEach(pattern => {
      const hasKeywords = pattern.keywords.some(keyword => 
        lowercaseInput.includes(keyword.toLowerCase())
      );
      
      if (hasKeywords) {
        foundPatterns.push(...pattern.keywords.filter(k => lowercaseInput.includes(k.toLowerCase())));
        if (pattern.risk === 'high') riskLevel = 'high';
        else if (pattern.risk === 'medium' && riskLevel !== 'high') riskLevel = 'medium';
      }
    });

    // Check for suspicious links
    if (lowercaseInput.includes('http') && !lowercaseInput.includes('https://')) {
      riskLevel = 'medium';
      foundPatterns.push('unsecure link');
    }

    // Check for urgency and pressure tactics
    const urgencyWords = ['urgent', 'immediate', 'asap', 'expire'];
    if (urgencyWords.some(word => lowercaseInput.includes(word))) {
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    let explanation = '';
    let tips: string[] = [];

    switch (riskLevel) {
      case 'high':
        explanation = 'This message shows strong signs of being a scam. It contains suspicious keywords and pressure tactics commonly used by fraudsters.';
        tips = [
          'Do NOT click any links or provide personal information',
          'Do NOT send money or gift cards',
          'Verify independently by contacting the organization directly',
          'Report this message to authorities'
        ];
        break;
      case 'medium':
        explanation = 'This message has some warning signs that suggest it could be suspicious. Please be cautious.';
        tips = [
          'Double-check the sender\'s identity',
          'Look for spelling and grammar mistakes',
          'Verify any claims independently',
          'When in doubt, don\'t respond'
        ];
        break;
      default:
        explanation = 'This message appears to be relatively safe, but always stay vigilant.';
        tips = [
          'Continue to be cautious with personal information',
          'Verify sender identity for important requests',
          'Keep your security software updated'
        ];
    }

    setResult({ risk: riskLevel, explanation, tips });
    setIsAnalyzing(false);
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
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Scam Detection Tool</h2>
        <p className="text-gray-600 text-lg">
          Paste suspicious messages, emails, or links below to check if they might be scams
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
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              <span>Check for Scams</span>
            </>
          )}
        </button>

        {result && (
          <div className={`mt-8 p-6 rounded-lg border-2 ${getRiskColor(result.risk)}`}>
            <div className="flex items-center space-x-3 mb-4">
              {getRiskIcon(result.risk)}
              <h3 className="text-xl font-bold">
                {result.risk === 'high' ? 'HIGH RISK - Likely Scam' :
                 result.risk === 'medium' ? 'MEDIUM RISK - Be Careful' :
                 'LOW RISK - Appears Safe'}
              </h3>
            </div>
            
            <p className="text-lg mb-4">{result.explanation}</p>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-lg">What you should do:</h4>
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
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Quick Safety Tips</h3>
        <ul className="text-blue-800 space-y-1">
          <li>• Never give personal information to unsolicited contacts</li>
          <li>• Legitimate organizations won't ask for passwords via email/text</li>
          <li>• Be suspicious of urgent requests for money or information</li>
          <li>• Always verify independently before taking action</li>
        </ul>
      </div>
    </div>
  );
}