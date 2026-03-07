import React from 'react';
import { Shield, AlertTriangle, Users, BookOpen } from 'lucide-react';

interface HeroProps {
  setActiveSection: (section: string) => void;
}

export function Hero({ setActiveSection }: HeroProps) {
  const stats = [
    { icon: AlertTriangle, value: '5.8M+', label: 'Scam attempts daily' },
    { icon: Users, value: '300K+', label: 'Users protected' },
    { icon: Shield, value: '99.2%', label: 'Detection accuracy' },
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
            Protect Yourself from
            <span className="text-blue-600"> Digital Scams</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            Get instant protection against fake calls, phishing messages, and fraudulent emails. 
            Learn to spot scams before they fool you.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setActiveSection('checker')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Check for Scams Now
            </button>
            <button
              onClick={() => setActiveSection('learn')}
              className="bg-white hover:bg-gray-50 text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 border-2 border-blue-600 hover:border-blue-700"
            >
              <BookOpen className="inline-block w-5 h-5 mr-2" />
              Learn About Scams
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-md text-center">
              <stat.icon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}