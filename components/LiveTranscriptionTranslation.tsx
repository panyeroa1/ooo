/**
 * Example Component: Live Transcription and Translation
 * Demonstrates how to use the transcription and translation services
 */

'use client';

import React, { useState } from 'react';
import { useTranscribeAndTranslate } from '@/lib/useTranscribeAndTranslate';

export default function LiveTranscriptionTranslation() {
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const {
    isProcessing,
    isListening,
    currentTranscript,
    currentTranslation,
    error,
    results,
    serviceHealth,
    processAudio,
    startRealtime,
    stopRealtime,
    clearResults,
    checkHealth,
    totalProcessed,
    averageLatency,
  } = useTranscribeAndTranslate({
    transcriptionProvider: 'deepgram',
    transcriptionLanguage: 'multi',
    translationProvider: 'ollama',
    targetLanguage,
    autoDetectLanguage: true,
    useCache: true,
  });

  // Load audio devices
  React.useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
      const audioDevices = deviceInfos.filter((device) => device.kind === 'audioinput');
      setDevices(audioDevices);
    });
  }, []);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await processAudio(file);
    } catch (err) {
      console.error('File processing error:', err);
    }
  };

  // Handle start/stop realtime
  const handleToggleRealtime = async () => {
    if (isListening) {
      stopRealtime();
    } else {
      try {
        await startRealtime(deviceId);
      } catch (err) {
        console.error('Failed to start realtime:', err);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6">Live Transcription & Translation</h1>

        {/* Service Health */}
        {serviceHealth && (
          <div className="mb-4 p-4 bg-gray-50 rounded">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Service Status</h3>
              <button
                onClick={checkHealth}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Refresh
              </button>
            </div>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  serviceHealth.overall === 'healthy' ? 'bg-green-500' :
                  serviceHealth.overall === 'degraded' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
                <span>Overall: {serviceHealth.overall}</span>
              </div>
              <div>Transcription: {serviceHealth.transcription.available ? '✓' : '✗'} 
                {serviceHealth.transcription.latency && ` (${serviceHealth.transcription.latency}ms)`}
              </div>
              <div>Translation: {serviceHealth.translation.available ? '✓' : '✗'}
                {serviceHealth.translation.latency && ` (${serviceHealth.translation.latency}ms)`}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="space-y-4 mb-6">
          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Target Language</label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isListening}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="ar">Arabic</option>
            </select>
          </div>

          {/* Device Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Microphone</label>
            <select
              value={deviceId || ''}
              onChange={(e) => setDeviceId(e.target.value || undefined)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isListening}
            >
              <option value="">Default</option>
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleToggleRealtime}
              disabled={isProcessing}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } disabled:opacity-50`}
            >
              {isListening ? '⏹ Stop Listening' : '🎤 Start Listening'}
            </button>

            <label className="flex-1 cursor-pointer">
              <div className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold text-center transition">
                📁 Upload Audio File
              </div>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isListening || isProcessing}
              />
            </label>

            <button
              onClick={clearResults}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600">Total Processed</div>
            <div className="text-2xl font-bold text-blue-600">{totalProcessed}</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-gray-600">Avg Latency</div>
            <div className="text-2xl font-bold text-green-600">
              {averageLatency > 0 ? `${Math.round(averageLatency)}ms` : '-'}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-red-500 text-xl">⚠️</span>
              <div>
                <div className="font-semibold text-red-800">Error</div>
                <div className="text-sm text-red-600">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin h-5 w-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
              <span className="text-yellow-800">Processing audio...</span>
            </div>
          </div>
        )}

        {/* Live Display */}
        {(currentTranscript || currentTranslation) && (
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span>📝</span>
                <span>Current Transcript</span>
                {isListening && (
                  <span className="ml-auto flex items-center gap-1 text-sm text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live
                  </span>
                )}
              </h3>
              <p className="text-gray-800 whitespace-pre-wrap">{currentTranscript}</p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span>🌐</span>
                <span>Translation ({targetLanguage.toUpperCase()})</span>
              </h3>
              <p className="text-gray-800 whitespace-pre-wrap">{currentTranslation}</p>
            </div>
          </div>
        )}

        {/* Results History */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Processing History</h3>
            {results.slice().reverse().map((result, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    {result.transcription.provider} → {result.translation.provider}
                  </span>
                  <span>{result.duration}ms</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1">Original</div>
                    <p className="text-gray-800">{result.transcription.transcript}</p>
                    {result.transcription.confidence && (
                      <div className="text-xs text-gray-500 mt-1">
                        Confidence: {(result.transcription.confidence * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1">Translated</div>
                    <p className="text-blue-700">{result.translation.translatedText}</p>
                    {result.translation.cached && (
                      <div className="text-xs text-green-600 mt-1">✓ Cached</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
