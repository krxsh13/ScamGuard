import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Search, Loader, RotateCcw } from 'lucide-react';
import { submitScan, pollScanResult, ScanResult } from '../api/scans.js';
import { ApiError } from '../types/api.js';

type ScanStatus = 'queued' | 'analyzing' | 'complete';

/**
 * Skeleton loading component
 */
function SkeletonLoader() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 space-y-6" role="status" aria-label="Loading scan results">
      {/* Header skeleton */}
      <div className="flex gap-6 mb-6">
        <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
        <div className="flex-grow space-y-3">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        </div>
      </div>

      {/* Section skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 bg-gray-200 rounded animate-pulse w-1/4" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Progress tracker component
 */
function ProgressTracker({ status }: { status: ScanStatus }) {
  const steps = [
    { key: 'queued', label: 'Queued' },
    { key: 'analyzing', label: 'Analyzing' },
    { key: 'complete', label: 'Complete' },
  ];

  const statusIndex = steps.findIndex((s) => s.key === status);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6" role="progressbar" aria-valuenow={statusIndex + 1} aria-valuemin={1} aria-valuemax={3}>
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => (
          <div key={step.key} className="flex flex-col items-center flex-1">
            {/* Step circle */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-2 transition-colors ${
                idx <= statusIndex
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {idx < statusIndex ? (
                <CheckCircle className="w-6 h-6" />
              ) : idx === statusIndex ? (
                <Loader className="w-6 h-6 animate-spin" />
              ) : (
                idx + 1
              )}
            </div>
            {/* Step label */}
            <p
              className={`text-sm font-medium ${
                idx <= statusIndex ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              {step.label}
            </p>

            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div
                className={`absolute left-0 right-0 h-1 top-5 transition-colors ${
                  idx < statusIndex ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                style={{
                  left: `${50 + idx * 33.33}%`,
                  width: '33.33%',
                  position: 'absolute',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


export function ScamChecker() {
  const [input, setInput] = useState('');
  const [scanType, setScanType] = useState<'text' | 'url' | 'image'>('text');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('queued');
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);

  const getRiskIcon = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'low':
        return <CheckCircle className="h-8 w-8 text-green-500" aria-hidden="true" />;
      case 'medium':
        return <AlertCircle className="h-8 w-8 text-yellow-500" aria-hidden="true" />;
      case 'high':
        return <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />;
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

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) {
      setError('Please enter content to analyze');
      return;
    }

    setIsAnalyzing(true);
    setIsTimedOut(false);
    setError(null);
    setResult(null);
    setScanStatus('queued');

    try {
      // Submit the scan
      const scanJob = await submitScan({
        type: scanType,
        content: input,
      });

      setCurrentScanId(scanJob.id);

      if (scanJob.result) {
        setResult(scanJob.result);
        setScanStatus('complete');
        return;
      }

      // Poll for results
      const finalResult = await pollScanResult(
        scanJob.id,
        (updatedResult) => {
          // Update status based on scan progress
          if (updatedResult.status === 'pending') {
            setScanStatus('queued');
          } else if (updatedResult.status === 'processing') {
            setScanStatus('analyzing');
          } else if (updatedResult.status === 'completed' || updatedResult.status === 'failed') {
            setScanStatus('complete');
          }

          // Update result as polling progresses
          setResult(updatedResult);
        }
      );

      setResult(finalResult);
      setScanStatus('complete');
    } catch (err) {
      let errorMessage = 'Failed to analyze content';

      if (err instanceof ApiError) {
        errorMessage = err.message;
        if (err.statusCode === 429) {
          errorMessage = 'Too many requests. Please wait before trying again.';
        } else if (err.statusCode === 400) {
          errorMessage = 'Invalid input. Please check your content and try again.';
        }
      } else if (err instanceof Error) {
        if (err.message.includes('timeout')) {
          setIsTimedOut(true);
          errorMessage = 'Scan analysis is taking longer than expected. The analysis may still be processing.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      console.error('Scan error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Handle retry on timeout
   */
  const handleRetry = async () => {
    if (!currentScanId) return;

    setIsAnalyzing(true);
    setIsTimedOut(false);
    setError(null);
    setScanStatus('analyzing');

    try {
      const finalResult = await pollScanResult(
        currentScanId,
        (updatedResult) => {
          if (updatedResult.status === 'pending') {
            setScanStatus('queued');
          } else if (updatedResult.status === 'processing') {
            setScanStatus('analyzing');
          } else {
            setScanStatus('complete');
          }
          setResult(updatedResult);
        },
        15000 // Shorter timeout for retry
      );

      setResult(finalResult);
      setScanStatus('complete');
    } catch (err) {
      let errorMessage = 'Retry failed';

      if (err instanceof Error && err.message.includes('timeout')) {
        setIsTimedOut(true);
        errorMessage = 'Scan is still processing. Please try again in a moment.';
      } else {
        errorMessage = err instanceof Error ? err.message : 'Failed to retrieve results';
      }

      setError(errorMessage);
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
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-gray-700">Scan Type</legend>
            <div className="flex gap-4 mb-6">
              {(['text', 'url', 'image'] as const).map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={type}
                    checked={scanType === type}
                    onChange={(e) => setScanType(e.target.value as 'text' | 'url' | 'image')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    aria-label={`Scan ${type}`}
                  />
                  <span className="capitalize text-gray-700 font-medium">{type}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Input Area */}
          <div>
            <label htmlFor="scan-input" className="block text-sm font-semibold text-gray-700 mb-3">
              {scanType === 'text' && 'Enter text to analyze'}
              {scanType === 'url' && 'Enter URL to analyze'}
              {scanType === 'image' && 'Paste image URL'}
            </label>
            <textarea
              id="scan-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                scanType === 'text'
                  ? 'Paste text, email, or message to check...'
                  : scanType === 'url'
                  ? 'https://example.com'
                  : 'https://example.com/image.jpg'
              }
              aria-describedby="scan-results"
              className="w-full h-32 p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
              disabled={isAnalyzing}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
              <p className="font-semibold mb-1">Error</p>
              <p>{error}</p>
              {isTimedOut && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  aria-label="Retry scan"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isAnalyzing || !input.trim()}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-busy={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader className="h-5 w-5 animate-spin" aria-hidden="true" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" aria-hidden="true" />
                Analyze Content
              </>
            )}
          </button>
        </form>
      </div>

      {/* Loading State with Progress and Skeleton */}
      {isAnalyzing && (
        <>
          <ProgressTracker status={scanStatus} />
          <SkeletonLoader />
        </>
      )}

      {/* Results Display */}
      {result && (result.status === 'completed' || result.status === 'failed') && !isAnalyzing && (
        <div
          id="scan-results"
          className={`bg-white rounded-lg shadow-lg p-8 border-2 ${getRiskColor(result.riskLevel)}`}
          role="region"
          aria-live="polite"
          aria-label="Scan results"
        >
          {/* Header */}
          <div className="flex gap-6 mb-6">
            <div className="flex-shrink-0">{getRiskIcon(result.riskLevel)}</div>
            <div className="flex-grow">
              <h3 className="text-2xl font-bold mb-2 text-gray-800">
                {result.riskLevel === 'low' && '✓ This looks safe'}
                {result.riskLevel === 'medium' && '⚠ Possible scam detected'}
                {result.riskLevel === 'high' && '🚨 Likely scam'}
              </h3>
              <p className="text-gray-600">
                Risk Score: <strong>{result.riskScore}</strong>/100 • Confidence: <strong>{result.confidence}%</strong>
              </p>
              {result.lowConfidenceWarning && (
                <p className="text-amber-700 text-sm mt-2">{result.lowConfidenceWarning}</p>
              )}
            </div>
          </div>

          {/* Detected Patterns */}
          {result.detectedPatterns && result.detectedPatterns.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Detected Patterns:</h4>
              <div className="space-y-2">
                {result.detectedPatterns.map((pattern, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-gray-700">
                    <span className="text-xl" aria-hidden="true">
                      •
                    </span>
                    <span>{pattern}</span>
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
                  <p className="text-2xl font-bold text-gray-800">{Math.round(result.linguisticCues.urgency * 100)}%</p>
                </div>
                <div className="bg-gray-100 rounded p-3 text-center">
                  <p className="text-sm text-gray-600 mb-1">Financial Pressure</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {Math.round(result.linguisticCues.financialPressure * 100)}%
                  </p>
                </div>
                <div className="bg-gray-100 rounded p-3 text-center">
                  <p className="text-sm text-gray-600 mb-1">Emotional Manipulation</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {Math.round(result.linguisticCues.emotionalManipulation * 100)}%
                  </p>
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
