import React from 'react';
import { Shield, Phone, Mail, AlertTriangle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold">ScamGuard</h3>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Protecting users from digital scams through education and real-time detection.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Emergency Contacts</h4>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>Fraud Hotline: 1-877-FTC-HELP</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Report: reportfraud@ftc.gov</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span>FBI IC3: ic3.gov</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Quick Resources</h4>
            <ul className="space-y-2 text-gray-300">
              <li>• Consumer Protection Guide</li>
              <li>• Identity Theft Resources</li>
              <li>• Senior Safety Tips</li>
              <li>• Business Fraud Prevention</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 ScamGuard. Protecting users from digital fraud.</p>
        </div>
      </div>
    </footer>
  );
}