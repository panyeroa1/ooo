'use client';

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { EburonAuth } from '@/lib/EburonAuth';
import { EburonDashboard } from '@/lib/EburonDashboard';
import roomStyles from '@/styles/Eburon.module.css';

export default function Page() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <main className={roomStyles.roomLayout}>
        <div className={roomStyles.ambient}><div className={roomStyles.orbLight} /></div>
        <div className="flex items-center justify-center w-full h-screen font-black text-white/10 uppercase tracking-[1em]">
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main className={roomStyles.roomLayout}>
      <div className={roomStyles.ambient}><div className={roomStyles.orbLight} /></div>
      
      {!user ? (
        <EburonAuth />
      ) : (
        <EburonDashboard user={user} />
      )}

      <div className="fixed bottom-3 w-full text-center pointer-events-none z-[100]">
        <span className="text-[10px] font-black tracking-[0.2em] text-white/10 uppercase">
          Powered by <b className="text-white/20">Eburon AI</b>
        </span>
      </div>
    </main>
  );
}
