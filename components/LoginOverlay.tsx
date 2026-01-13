'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { dbClient as supabase } from '@/lib/orbit/services/dbClient';

export function LoginOverlay() {
    const { user, signInWithEmail, signOut } = useAuth();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'host_speaker' | 'receiver_translator'>('receiver_translator');
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    // If user is logged in, we verify if they have a role update pending or just show nothing?
    // Ideally, if logged in, this overlay should disappear or show a "Logged in as..." status.
    if (user) {
        return null; // Or a small floating badge
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('sending');
        try {
            // 1. Start Auth Flow
            await signInWithEmail(email);

            // 2. We can't set the role on the user record *yet* because they aren't signed in until they click the link.
            // However, we can store it in localStorage to apply it after the redirect callback.
            if (typeof window !== 'undefined') {
                window.localStorage.setItem('orbit_pending_role', role);
            }

            setStatus('sent');
        } catch (err) {
            console.error(err);
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md p-8 rounded-2xl border border-white/10 bg-[#0A0A0A] shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-2 text-center">Success Class Access</h2>
                <p className="text-white/50 text-center mb-8">Sign in to identify your role in the session.</p>

                {status === 'sent' ? (
                    <div className="text-green-400 text-center bg-green-900/10 p-4 rounded-lg border border-green-500/20">
                        <p className="font-medium">Magic Link Sent!</p>
                        <p className="text-sm mt-2 opacity-80">Check your email ({email}) to complete sign in.</p>
                        <button
                            onClick={() => setStatus('idle')}
                            className="mt-4 text-xs text-white/40 hover:text-white underline"
                        >
                            Try different email
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-xs font-semibold text-white/40 uppercase mb-2 ml-1">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
                                placeholder="miles@eburon.ai"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-white/40 uppercase mb-2 ml-1">Select Role</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole('host_speaker')}
                                    className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${role === 'host_speaker'
                                            ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                        }`}
                                >
                                    Host Speaker
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('receiver_translator')}
                                    className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${role === 'receiver_translator'
                                            ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                        }`}
                                >
                                    Receiver (Translator)
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'sending'}
                            className="w-full bg-[#D4AF37] hover:bg-[#C5A028] text-black font-bold py-3.5 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'sending' ? 'Sending Link...' : 'Send Magic Link'}
                        </button>

                        {status === 'error' && (
                            <p className="text-red-400 text-xs text-center">Failed to send link. Check logs or try again.</p>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}
