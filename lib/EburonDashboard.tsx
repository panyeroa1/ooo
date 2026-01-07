'use client';

import React, { useState } from 'react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import styles from '@/styles/Eburon.module.css';
import { generateRoomId } from '@/lib/client-utils';

interface EburonDashboardProps {
  user: any;
}

export function EburonDashboard({ user }: EburonDashboardProps) {
  const [sessionCode, setSessionCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);

  const handleLogout = () => signOut(auth);

  const startClass = () => {
    const roomId = generateRoomId();
    window.location.assign(`/rooms/${roomId}`);
  };

  const joinClass = () => {
    if (sessionCode) {
      window.location.assign(`/rooms/${sessionCode}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4">
      <div className={styles.dashHeader}>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <span className="text-sm font-bold text-white/30 uppercase tracking-widest">
            {user?.email?.split('@')[0] || 'User'}
          </span>
        </div>
        <button 
          onClick={handleLogout}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors"
          title="Logout"
        >
          <span className="text-xl leading-none">&times;</span>
        </button>
      </div>

      <div className={styles.bentoGrid}>
        <div className={`${styles.ebTile} ${styles.ebTileLarge} group hover:border-[#D4AF37]/50 transition-all`} onClick={startClass}>
          <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🎙️</div>
          <h3 className="font-bold text-lg mb-1">Start Class</h3>
          <span className="text-[10px] uppercase tracking-widest font-black text-white/20">Launch Orbit Intelligence</span>
        </div>
        
        <div className={`${styles.ebTile} hover:border-white/20 transition-all`} onClick={() => setShowJoinModal(true)}>
          <div className="text-3xl mb-3">🔗</div>
          <h3 className="font-bold text-sm mb-1 text-center">Join</h3>
          <span className="text-[10px] uppercase tracking-widest font-black text-white/20">Enter Code</span>
        </div>

        <div className={`${styles.ebTile} opacity-50 cursor-not-allowed`}>
          <div className="text-3xl mb-3">📅</div>
          <h3 className="font-bold text-sm mb-1 text-center">Schedule</h3>
          <span className="text-[10px] uppercase tracking-widest font-black text-white/20">Coming Soon</span>
        </div>
      </div>

      {showJoinModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-[85%] max-w-[320px] bg-[#111] border border-white/10 rounded-[24px] p-8 text-center shadow-2xl">
            <h3 className="text-lg font-bold mb-6">Join Class</h3>
            <input 
              type="text" 
              placeholder="Session ID" 
              className={styles.ebInput}
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value)}
            />
            <button className={`${styles.ebButton} ${styles.ebButtonPrimary}`} onClick={joinClass}>
              Connect
            </button>
            <button className={`${styles.ebButton} ${styles.ebButtonSec}`} onClick={() => setShowJoinModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
