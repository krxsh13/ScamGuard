import React, { useState } from 'react';
import { Phone, MessageSquare, Mail, Link, AlertTriangle } from 'lucide-react';

export function Education() {
  const [selectedScam, setSelectedScam] = useState<string | null>(null);

  const scamTypes = [
    {
      id: 'phone',
      icon: Phone,
      title: 'Fake Phone Calls',
      description: 'Scammers pretending to be from banks, government, or tech support',
      warning: 'They pressure you to share personal information or send money immediately',
      examples: [
        'Calls claiming your bank account is frozen',
        'Tech support saying your computer is infected',
        'Government officials demanding immediate payment'
      ],
      redFlags: [
        'Caller ID can be fake - don\'t trust it',
        'Asking for passwords, PINs, or personal details',
        'Demanding immediate action or payment',
        'Threatening consequences if you don\'t comply'
      ],
      protection: [
        'Hang up and call the organization directly',
        'Never give personal information over the phone',
        'Take time to think - legitimate calls can wait',
        'Ask for a reference number and verify independently'
      ]
    },
    {
      id: 'sms',
      icon: MessageSquare,
      title: 'Phishing SMS',
      description: 'Text messages trying to steal your personal information or money',
      warning: 'Often claim urgent problems with your accounts or offer fake prizes',
      examples: [
        'Bank KYC verification messages',
        'Fake lottery or prize notifications',
        'Account suspension warnings'
      ],
      redFlags: [
        'Links to suspicious websites',
        'Urgent language and time pressure',
        'Requests for personal information',
        'Poor spelling and grammar'
      ],
      protection: [
        'Never click links in suspicious texts',
        'Contact your bank directly if concerned',
        'Delete suspicious messages immediately',
        'Report scam texts to your mobile provider'
      ]
    },
    {
      id: 'email',
      icon: Mail,
      title: 'Phishing Emails',
      description: 'Fake emails designed to trick you into revealing sensitive information',
      warning: 'Often look like they come from trusted companies or government agencies',
      examples: [
        'Fake bank security alerts',
        'Fraudulent online shopping confirmations',
        'Government refund notifications'
      ],
      redFlags: [
        'Generic greetings like "Dear Customer"',
        'Mismatched sender addresses',
        'Urgent threats about account closure',
        'Requests to update payment information'
      ],
      protection: [
        'Check sender email address carefully',
        'Don\'t click links - type URLs directly',
        'Use two-factor authentication',
        'Keep email software updated'
      ]
    },
    {
      id: 'links',
      icon: Link,
      title: 'Malicious Links',
      description: 'Dangerous websites that steal information or install malware',
      warning: 'Can look exactly like legitimate websites but steal your data',
      examples: [
        'Fake banking login pages',
        'Counterfeit shopping websites',
        'Fraudulent social media login screens'
      ],
      redFlags: [
        'URLs that don\'t match the real company',
        'Missing security certificates (no https://)',
        'Poor website design or spelling errors',
        'Asking for unnecessary personal information'
      ],
      protection: [
        'Always type URLs directly into your browser',
        'Look for the padlock symbol in your browser',
        'Check the URL carefully for misspellings',
        'Use bookmarks for important websites'
      ]
    }
  ];

  const selectedScamData = scamTypes.find(scam => scam.id === selectedScam);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Learn About Common Scams</h2>
        <p className="text-gray-600 text-lg">
          Understanding these scam types will help you stay safe online and over the phone
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {scamTypes.map((scam) => (
          <button
            key={scam.id}
            onClick={() => setSelectedScam(scam.id === selectedScam ? null : scam.id)}
            className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
              selectedScam === scam.id
                ? 'border-blue-500 bg-blue-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
            }`}
          >
            <scam.icon className={`h-8 w-8 mb-4 ${
              selectedScam === scam.id ? 'text-blue-600' : 'text-gray-600'
            }`} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{scam.title}</h3>
            <p className="text-gray-600 text-sm">{scam.description}</p>
          </button>
        ))}
      </div>

      {selectedScamData && (
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div className="flex items-center space-x-3 mb-6">
            <selectedScamData.icon className="h-8 w-8 text-blue-600" />
            <h3 className="text-2xl font-bold text-gray-900">{selectedScamData.title}</h3>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 mb-1">Warning:</h4>
                <p className="text-red-800">{selectedScamData.warning}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-3">Common Examples:</h4>
              <ul className="space-y-2">
                {selectedScamData.examples.map((example, index) => (
                  <li key={index} className="text-gray-700 flex items-start space-x-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-red-50 rounded-lg p-6">
              <h4 className="font-semibold text-red-900 mb-3">Red Flags to Watch:</h4>
              <ul className="space-y-2">
                {selectedScamData.redFlags.map((flag, index) => (
                  <li key={index} className="text-red-800 flex items-start space-x-2">
                    <span className="text-red-600 mt-1">⚠</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-green-50 rounded-lg p-6">
              <h4 className="font-semibold text-green-900 mb-3">How to Protect Yourself:</h4>
              <ul className="space-y-2">
                {selectedScamData.protection.map((tip, index) => (
                  <li key={index} className="text-green-800 flex items-start space-x-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}