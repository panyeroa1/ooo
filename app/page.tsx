'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { encodePassphrase, generateRoomId, randomString } from '@/lib/client-utils';
import styles from '../styles/Home.module.css';

function ControlCard() {
  const router = useRouter();
  const [e2ee, setE2ee] = useState(false);
  const [sharedPassphrase, setSharedPassphrase] = useState(randomString(64));

  const joinRoom = () => {
    const roomId = generateRoomId();
    const href = e2ee ? `/rooms/${roomId}#${encodePassphrase(sharedPassphrase)}` : `/rooms/${roomId}`;
    router.push(href);
  };

  return (
    <div className={styles.controlCard}>
      <h3>Launch instant premium room</h3>
      <p>Auto-configured HD connection, encrypted by default.</p>
      <button className={styles.primaryButton} onClick={joinRoom}>
        Start premium meeting
      </button>
      <div className={styles.cardSettings}>
        <label className={styles.switchLabel}>
          <input
            type="checkbox"
            checked={e2ee}
            onChange={(ev) => setE2ee(ev.target.checked)}
          />
          <span>Enable E2E encryption</span>
        </label>
        {e2ee && (
          <input
            className={styles.passphraseInput}
            type="password"
            value={sharedPassphrase}
            onChange={(ev) => setSharedPassphrase(ev.target.value)}
            placeholder="Enter passphrase..."
          />
        )}
      </div>
    </div>
  );
}

function ConnectionCard() {
  return (
    <div className={styles.highlightCard}>
      <h3>Enterprise integration toolkit</h3>
      <p>Connect tokens, servers, or self-hosted Orbit clouds with a single form.</p>
      <button className={styles.secondaryButton} onClick={() => window.location.assign('/integrations')}>
        Explore integrations
      </button>
    </div>
  );
}

export default function Page() {
  return (
    <main className={styles.main}>
      <div className={styles.heroLayer}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.badgeDot} />
            Enterprise-grade experience
          </div>
          <Image
            className={styles.logo}
            src="/images/success-class-logo.svg"
            alt="Eburon Meet"
            width={220}
            height={36}
            priority
          />
          <h1 className={styles.headline}>
            Premium meetings with
            <span className={styles.headlineAccent}> AI-native translation & voice </span>
          </h1>
          <p className={styles.subheadline}>
            Full-stack conferencing, contextual transcripts, and AI-powered narration that adapts to every speaker.
            Built for teams who need clarity, speed, and control.
          </p>
          <div className={styles.heroStats}>
            <div>
              <strong>4K</strong>
              <span>High-definition video</span>
            </div>
            <div>
              <strong>+</strong>
              <span>Instant AI translation</span>
            </div>
            <div>
              <strong>Secure</strong>
              <span>E2EE with granular access</span>
            </div>
          </div>
        </div>
        <div className={styles.heroCardWrap}>
          <ControlCard />
          <ConnectionCard />
        </div>
      </div>

      <section className={styles.featuresGrid}>
        {[
          { title: 'Adaptive AI captions', body: 'Realtime Supabase archive + translation memory.' },
          { title: 'Translation dashboard', body: 'Ticker-style feed, translation engine switching, and TTS playback.' },
          { title: 'Broadcast controls', body: 'Single-source broadcaster, audio muting, and continuous saves.' },
          { title: 'Integrations', body: 'Extensible AI tooling, Gemini, Ollama, Cartesia, and LiveKit together.' },
        ].map((feature) => (
          <article key={feature.title} className={styles.featureTile}>
            <div className={styles.featureIcon}>{feature.title.charAt(0)}</div>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </article>
        ))}
      </section>

      <section className={styles.integrationBanner}>
        <div>
          <h2>Integrations for every workflow</h2>
          <p>
            Connect voice engines, analytics, and automation in one place. Tap the integration suite for AI tools that
            amplify every meeting with smarter context.
          </p>
        </div>
        <button className={styles.primaryButton} onClick={() => window.location.assign('/integrations')}>
          View integration tools
        </button>
      </section>
    </main>
  );
}
