import React from 'react';
import { FileAudio, Zap, Shield, Clock, ArrowRight } from 'lucide-react';
import { Auth } from './Auth';

interface LandingPageProps {
  onAuthSuccess: () => void;
}

export function LandingPage({ onAuthSuccess }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileAudio className="h-8 w-8 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">AudioPDF</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
            {/* Left Column */}
            <div className="lg:col-span-6 px-4 py-12 sm:px-6 lg:px-8">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                Transform Your PDFs into
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  {' '}Professional Audiobooks
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Convert any PDF document into high-quality audio using advanced AI technology.
                Perfect for learning, accessibility, and multitasking.
              </p>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-6 mb-12">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <Zap className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Fast Conversion</h3>
                    <p className="text-sm text-gray-600">Convert PDFs in minutes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <Shield className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Secure</h3>
                    <p className="text-sm text-gray-600">Your files are protected</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <Clock className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Save Time</h3>
                    <p className="text-sm text-gray-600">Listen on the go</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <ArrowRight className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Easy to Use</h3>
                    <p className="text-sm text-gray-600">Simple drag & drop</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Auth Form */}
            <div className="lg:col-span-6 px-4 sm:px-6 lg:px-8">
              <Auth onSuccess={onAuthSuccess} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}