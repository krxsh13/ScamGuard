import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Search, Loader } from 'lucide-react';
import { submitScan, pollScanResult, ScanResult } from '../api/scans.js';


export function ScamChecker() {
  const [input, setInput] = useState('');
  const [scanType, setScanType] = useState<'text' | 'url' | 'image'>('text');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRiskIcon = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'low':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'medium':
        return <AlertCircle className="h-8 w-8 text-yellow-500" />;
      case 'high':
        return <AlertTriangle className="h-8 w-8 text-red-500" />;
    }
  };

  const getRiskColor = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'low':
        return 'bg-green-50 border-green-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'high':
        return 'bg-red-50 border-red-200';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) {
      setError('Please enter content to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // Submit the scan
      const scanJob = await submitScan({
        type: scanType,
        content: input,
      });

      // Poll for results
      const finalResult = await pollScanResult(scanJob.id, (updatedResult) => {
        // Update result as polling progresses
        setResult(updatedResult);
      });

      setResult(finalResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze content';
      setError(errorMessage);
      console.error('Scan error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Input Form */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">Scam Detector</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Scan Type Selection */}
          <div className="flex gap-4 mb-6">
            {(['text', 'url', 'image'] as const).map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={type}
                  checked={scanType === type}
                  onChange={(e) => setScanType(e.target.value as 'text' | 'url' | 'image')}
                  className="w-4 h-4"
                />
                <span className="capitalize text-gray-700 font-medium">{type}</span>
              </label>
            ))}
          </div>

          {/* Input Area */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {scanType === 'text' && 'Enter text to analyze'}
              {scanType === 'url' && 'Enter URL to analyze'}
              {scanType === 'image' && 'Paste image URL'}
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                scanType === 'text'
                  ? 'Paste text, email, or message to check...'
                  : scanType === 'url'
                  ? 'https://example.com'
                  : 'https://example.com/image.jpg'
              }
              className="w-full h-32 p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
              disabled={isAnalyzing}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isAnalyzing || !input.trim()}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Analyze Content
              </>
            )}
          </button>
        </form>
      </div>

      {/* Loading State */}
      {isAnalyzing && result && result.status !== 'completed' && result.status !== 'failed' && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-gray-600 font-medium">
              {result.status === 'pending' ? 'Queuing analysis...' : 'Processing your content...'}
            </p>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (result.status === 'completed' || result.status === 'failed') && (
        <div className={`bg-white rounded-lg shadow-lg p-8 border-2 ${getRiskColor(result.riskLevel)}`}>
          <div className="flex gap-6 mb-6">
            <div className="flex-shrink-0">
              {getRiskIcon(result.riskLevel)}
            </div>
            <div className="flex-grow">
              <h3 className="text-2xl font-bold mb-2 text-gray-800">
                {result.riskLevel === 'low' && '✓ This looks safe'}
                {result.riskLevel === 'medium' && '⚠ Possible scam detected'}
                {result.riskLevel === 'high' && '🚨 Likely scam'}
              </h3>
              <p className="text-gray-600">
                Risk Score: {result.riskScore}/100 • Confidence: {result.confidence}%
              </p>
            </div>
          </div>

          {/* Detected Patterns */}
          {result.detectedPatterns && result.detectedPatterns.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Detected Patterns:</h4>
              <div className="space-y-2">
                {result.detectedPatterns.map((pattern, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-gray-700">
                    <span className="text-xl">•</span>
                    <span className="capitalize">{pattern}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linguistic Cues */}
          {result.linguisticCues && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Linguistic Analysis:</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-100 rounded p-3 text-center">
                  <p className="text-sm text-gray-600 mb-1">Urgency</p>
                  <p className="text-2xl font-bold text-gray-800">{Math.round(result.linguisticCues.urgency)}%</p>
                </div>
                <div className="bg-gray-100 rounded p-3 text-center">
                  <p className="text-sm text-gray-600 mb-1">Financial Pressure</p>
                  <p className="text-2xl font-bold text-gray-800">{Math.round(result.linguisticCues.financialPressure)}%</p>
                </div>
                <div className="bg-gray-100 rounded p-3 text-center">
                  <p className="text-sm text-gray-600 mb-1">Emotional Manipulation</p>
                  <p className="text-2xl font-bold text-gray-800">{Math.round(result.linguisticCues.emotionalManipulation)}%</p>
                </div>
              </div>
            </div>
          )}

          {/* URL Analysis */}
          {result.threatIntelligence?.urlAnalysis && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">URL Analysis:</h4>
              {result.threatIntelligence.urlAnalysis.isSuspicious ? (
                <div className="bg-red-100 border border-red-300 rounded p-4 text-red-700">
                  <p className="font-semibold mb-2">Suspicious URLs Detected:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {result.threatIntelligence.urlAnalysis.issues?.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-green-700">No suspicious URLs detected.</p>
              )}
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="font-semibold text-blue-900 mb-2">Safety Tips:</p>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>• Never click links from unknown sources</li>
              <li>• Don't provide personal or financial information</li>
              <li>• Verify sender identity through official channels</li>
              <li>• Be suspicious of urgent or emotional requests</li>
              <li>• Report suspected scams to authorities</li>
            </ul>
          </div>
        </div>
      )}

      {/* No Results Message */}
      {!isAnalyzing && !result && !error && (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-600">
          <p className="text-lg">Enter content and click "Analyze Content" to get started</p>
        </div>
      )}

    </div>
  );
}