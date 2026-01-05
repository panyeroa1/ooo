'use client';

import React, { useState, useEffect } from 'react';
import { Settings, X, Webhook, Languages, Volume2, Save } from 'lucide-react';
import { TtsProvider } from '../types';

interface AdminSettingsProps {
  onClose?: () => void;
  activeTab?: 'translation' | 'tts' | 'webhooks' | 'general';
  hideHeader?: boolean;
}

interface AdminConfig {
  translationModel: 'ollama-cloud' | 'gemini-live' | 'internal';
  ttsProvider: TtsProvider;
  ollamaCloudUrl?: string;
  ollamaCloudApiKey?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

export function AdminSettings({ onClose, activeTab: externalActiveTab, hideHeader = false }: AdminSettingsProps) {
  const [localActiveTab, setLocalActiveTab] = useState<'translation' | 'tts' | 'webhooks' | 'general'>('translation');
  const activeTab = externalActiveTab || localActiveTab;
  const setActiveTab = (tab: any) => setLocalActiveTab(tab);

  const [config, setConfig] = useState<AdminConfig>({
    translationModel: 'internal',
    ttsProvider: 'gemini',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to load admin config:', err);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      if (res.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      console.error('Failed to save admin config:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-transparent text-white`}>
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#1a1f2e]">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold">Admin Settings</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              title="Close Settings"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      {!hideHeader && (
        <div className="flex gap-1 p-3 border-b border-white/5 bg-black/20">
          <button
            onClick={() => setActiveTab('translation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'translation'
                ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <Languages className="w-3.5 h-3.5 inline mr-1.5" />
            Translation
          </button>
          <button
            onClick={() => setActiveTab('tts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'tts'
                ? 'bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20'
                : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 inline mr-1.5" />
            TTS
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'webhooks'
                ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20'
                : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <Webhook className="w-3.5 h-3.5 inline mr-1.5" />
            Webhooks
          </button>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 overflow-y-auto ${hideHeader ? 'p-0' : 'p-4'}`}>
          {activeTab === 'translation' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">Translation Model</label>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setConfig({ ...config, translationModel: 'internal' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      config.translationModel === 'internal'
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="font-semibold text-white">Internal Translator</div>
                    <div className="text-sm text-slate-400 mt-1">Use built-in translation API</div>
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, translationModel: 'gemini-live' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      config.translationModel === 'gemini-live'
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="font-semibold text-white">Orbit Live</div>
                    <div className="text-sm text-slate-400 mt-1">Real-time AI translation</div>
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, translationModel: 'ollama-cloud' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      config.translationModel === 'ollama-cloud'
                        ? 'border-purple-500/50 bg-purple-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="font-semibold text-white">Ollama Cloud</div>
                    <div className="text-sm text-slate-400 mt-1">Self-hosted or cloud LLM translation</div>
                  </button>
                </div>
              </div

>

              {config.translationModel === 'ollama-cloud' && (
                <div className="space-y-4 p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Ollama Cloud URL</label>
                    <input
                      type="url"
                      value={config.ollamaCloudUrl || ''}
                      onChange={(e) => setConfig({ ...config, ollamaCloudUrl: e.target.value })}
                      placeholder="https://your-ollama-instance.com"
                      className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">API Key (Optional)</label>
                    <input
                      type="password"
                      value={config.ollamaCloudApiKey || ''}
                      onChange={(e) => setConfig({ ...config, ollamaCloudApiKey: e.target.value })}
                      placeholder="Enter API key if required"
                      className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tts' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">Default TTS Provider</label>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setConfig({ ...config, ttsProvider: 'gemini' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      config.ttsProvider === 'gemini'
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="font-semibold text-white">Orbit Voice</div>
                    <div className="text-sm text-slate-400 mt-1">Neural voice synthesis</div>
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, ttsProvider: 'deepgram' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      config.ttsProvider === 'deepgram'
                        ? 'border-violet-500/50 bg-violet-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="font-semibold text-white">Eburon Voice</div>
                    <div className="text-sm text-slate-400 mt-1">Multi-language premium voices</div>
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, ttsProvider: 'cartesia' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      config.ttsProvider === 'cartesia'
                        ? 'border-pink-500/50 bg-pink-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="font-semibold text-white">Orbit Premium</div>
                    <div className="text-sm text-slate-400 mt-1">Ultra-low latency expressive voices</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'webhooks' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Transcription Webhook URL</label>
                <input
                  type="url"
                  value={config.webhookUrl || ''}
                  onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                  placeholder="https://your-webhook-endpoint.com/transcription"
                  className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <p className="text-xs text-slate-500 mt-2">Optional: Receive transcription events via webhook</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Webhook Secret</label>
                <input
                  type="password"
                  value={config.webhookSecret || ''}
                  onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
                  placeholder="Enter secret for webhook signature validation"
                  className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>
          )}
        </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
        <div>
          {saveStatus === 'success' && (
            <span className="text-xs text-emerald-400">✓ Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-400">✗ Error</span>
          )}
        </div>
        <button
          onClick={saveConfig}
          disabled={isSaving}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          <Save className="w-3.5 h-3.5" />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
