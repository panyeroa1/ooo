'use client';

import React from 'react';
import { Settings, X, Mic, Video, Speaker, ShieldCheck } from 'lucide-react';
import { CameraSettings } from '@/lib/CameraSettings';
import { MicrophoneSettings } from '@/lib/MicrophoneSettings';
import { MediaDeviceMenu, useMaybeRoomContext } from '@livekit/components-react';
import roomStyles from '@/styles/Eburon.module.css';

interface AdminSettingsProps {
  onClose?: () => void;
  activeTab?: string;
  hideHeader?: boolean;
}

export function AdminSettings({ onClose, hideHeader = false }: AdminSettingsProps) {
  const room = useMaybeRoomContext();

  return (
    <div className={roomStyles.sidebarPanel}>
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Settings className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight uppercase">Room Settings</h2>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Device & System Config</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close settings"
              title="Close settings"
              className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white group"
            >
              <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-8 scrollbar-hide">
        {room ? (
          <>
            {/* Audio Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Audio Input</h3>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4 shadow-sm">
                <MicrophoneSettings />
              </div>
            </section>

            {/* Video Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Video className="w-3.5 h-3.5 text-indigo-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Camera & Effects</h3>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4 shadow-sm">
                <CameraSettings />
              </div>
            </section>

            {/* Output Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Speaker className="w-3.5 h-3.5 text-pink-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Audio Output</h3>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-slate-300">Default Output</span>
                  <div className="lk-button-group">
                    <div className="lk-button-group-menu">
                      <MediaDeviceMenu kind="audiooutput" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="space-y-6 py-4">
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4 text-center">
              <div className="inline-flex p-3 rounded-full bg-slate-500/10 mb-2">
                <Settings className="w-6 h-6 text-slate-500" />
              </div>
              <h3 className="text-sm font-bold text-white">Global Configuration</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect to a room to manage your active media devices and background effects. 
                System engines are configured via environment variables.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mic className="w-4 h-4 text-emerald-500/50" />
                  <span className="text-xs font-medium text-slate-400">Transcription Engine</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">Deepgram Nova-2</span>
              </div>
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Speaker className="w-4 h-4 text-pink-500/50" />
                  <span className="text-xs font-medium text-slate-400">TTS Engine</span>
                </div>
                <span className="text-[10px] font-bold text-pink-500/80 uppercase tracking-widest">Cartesia Sonic</span>
              </div>
            </div>
          </section>
        )}

        {/* Version Info / Info Section */}
        <section className="pt-4 border-t border-white/5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-slate-600" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Secure E2EE Active</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-700">v0.2.0-EB</span>
          </div>
        </section>
      </div>

      {/* Footer Branding */}
      <div className="p-5 mt-auto bg-black/20 border-t border-white/5">
        <div className="flex flex-col items-center gap-1 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-500">
          <span className="text-[8px] font-black tracking-[0.3em] text-slate-400 uppercase">Powered by</span>
          <span className="text-[10px] font-black tracking-tighter text-white">EBURON AI</span>
        </div>
      </div>
    </div>
  );
}
