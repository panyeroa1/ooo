import React, { useState } from 'react';
import { AdminSettings } from '@/lib/orbit/components/AdminSettings';
import { Languages, Volume2, Webhook, ChevronLeft, Layout, Shield, Activity } from 'lucide-react';

type TabType = 'translation' | 'tts' | 'webhooks' | 'general';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('translation');

  const navItems = [
    { id: 'translation', label: 'Translation', icon: Languages, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { id: 'tts', label: 'Voice & TTS', icon: Volume2, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { id: 'webhooks', label: 'API & Webhooks', icon: Webhook, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'general', label: 'General', icon: Layout, color: 'text-slate-400', bg: 'bg-slate-500/10' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-200 flex flex-col">
      {/* Top Header */}
      <header className="h-16 border-b border-white/5 bg-[#0d1117] flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.history.back()}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-[1px] bg-white/10" />
          <h1 className="text-sm font-bold tracking-tight uppercase text-slate-400">Settings Center</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Eburon Cloud Sync</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-white/5 bg-[#0d1117] flex flex-col p-4 gap-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Configuration</div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                activeTab === item.id 
                  ? `${item.bg} ring-1 ring-white/10` 
                  : 'hover:bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <item.icon className={`w-4 h-4 ${activeTab === item.id ? item.color : 'group-hover:text-slate-300'}`} />
              <span className={`text-sm font-medium ${activeTab === item.id ? 'text-white' : ''}`}>
                {item.label}
              </span>
            </button>
          ))}

          <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
             <div className="px-3">
               <div className="text-[10px] font-bold text-slate-600 uppercase tracking-tight mb-2">System Health</div>
               <div className="flex items-center gap-2 mb-1">
                 <Activity className="w-3 h-3 text-emerald-500" />
                 <span className="text-[10px] text-slate-400">Core Services Operational</span>
               </div>
               <div className="flex items-center gap-2">
                 <Shield className="w-3 h-3 text-blue-500" />
                 <span className="text-[10px] text-slate-400">Security: Tier 1 Active</span>
               </div>
             </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-[#0a0c10] p-8">
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                {navItems.find(n => n.id === activeTab)?.label}
              </h2>
              <p className="text-slate-400 text-sm">
                Manage your {activeTab} preferences and external integration endpoints.
              </p>
            </div>

            <div className="bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6">
              <AdminSettings 
                activeTab={activeTab} 
                hideHeader={true}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
