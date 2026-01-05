'use client';

import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import { encodePassphrase, generateRoomId, randomString } from '@/lib/client-utils';
import styles from '../styles/Home.module.css';

function ControlCard() {
  const [e2ee, setE2ee] = useState(false);
  const [sharedPassphrase, setSharedPassphrase] = useState(randomString(64));

  const handleJoin = () => {
    const roomId = generateRoomId();
    const href = e2ee ? `/rooms/${roomId}#${encodePassphrase(sharedPassphrase)}` : `/rooms/${roomId}`;
    window.location.assign(href);
  };

  return (
    <div className={styles.controlCard}>
      <h3>Launch instant premium room</h3>
      <p>Auto-configured HD connection that rivals the competition.</p>
      <button className={styles.primaryButton} onClick={handleJoin}>
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



export default function Page() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isRecording, setIsRecording] = useState(false);
  const [recordUrl, setRecordUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  const toggleRecording = async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunks.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        localStorage.setItem('lastMeetingClip', url);
        setRecordUrl(url);
        recordedChunks.current = [];
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error', error);
    }
  };



  return (
    <main className={styles.main}>
      <section className={styles.heroLayer}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.badgeDot} />
            Success Class • Powered by Orbit AI
          </div>
          <a href="/integrations" className={styles.integrationIcon} aria-label="View integrations">
            🔗
          </a>
          <button
            className={styles.themeToggle}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? 'Light theme' : 'Dark theme'}
          </button>
          <Image
            className={styles.logo}
            src="/images/success-class-logo.svg"
            alt="Success Class"
            width={220}
            height={36}
            priority
          />
          <h1 className={styles.headline}>
            Success Class meetings with <span className={styles.headlineAccent}>Orbit AI intelligence</span>
          </h1>
          <p className={styles.subheadline}>
            Crystal-clear video, Orbit AI insights, and live session summaries that stay on pace with every speaker.
          </p>
          <div className={styles.heroStats}>
            <div>
              <strong>4K</strong>
              <span>Ultra HD streaming</span>
            </div>
            <div>
              <strong>Orbit AI</strong>
              <span>Insights + Summaries</span>
            </div>
            <div>
              <strong>Secure</strong>
              <span>Per-room access controls</span>
            </div>
            <div>
              <button className={`${styles.secondaryButton} ${styles.recordBtn}`} onClick={toggleRecording}>
                {isRecording ? 'Stop recording' : 'Record meeting clip'}
              </button>
            </div>
            {recordUrl && (
              <div className={styles.recordPreview}>
                <strong>Last clip ready</strong>
                <video src={recordUrl} controls className={styles.recordedVideo} />
              </div>
            )}
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.heroCardWrap}>
            <ControlCard />
          </div>
          <Image
            src="/images/premium-hero.png"
            alt="Futuristic Meeting Interface"
            width={800}
            height={450}
            priority
            className={styles.heroImg}
          />
        </div>
      </section>

      <section className={styles.zigZagSection}>
        {/* Item 1: Analytics (Left Text, Right Image) */}
        <div className={styles.zigZagRow}>
          <div className={styles.zigZagContent}>
            <h2>Analytics & Insights</h2>
            <p>
              Real-time sentiment analysis, speaker highlights, and Orbit AI engagement streams.
              Visualize your meeting data with our premium dashboard.
            </p>
          </div>
          <div className={styles.zigZagVisual}>
            <Image
              src="/images/dashboard-feature.png"
              alt="Analytics Dashboard"
              width={600}
              height={400}
              className={styles.featureImg}
            />
          </div>
        </div>

        {/* Item 2: Translation (Right Text, Left Image) */}
        <div className={`${styles.zigZagRow} ${styles.rowReverse}`}>
          <div className={styles.zigZagContent}>
            <h2>Orbit AI Highlights</h2>
            <p>Live, nuance-aware insights that adapt to speaker cadence.</p>
          </div>
          <div className={styles.zigZagVisual}>
             <Image
              src="/images/feature-translation.png"
              alt="Orbit AI Highlights"
              width={600}
              height={400}
              className={styles.featureImg}
            />
          </div>
        </div>

        {/* Item 3: Workflow (Left Text, Right Image) */}
        <div className={styles.zigZagRow}>
          <div className={styles.zigZagContent}>
            <h2>Flow Automation</h2>
            <p>Connect Orbit AI voice, insights, and automations in one seamless pipe.</p>
          </div>
          <div className={styles.zigZagVisual}>
             <Image
              src="/images/feature-workflow.png"
              alt="Workflow Automation"
              width={600}
              height={400}
              className={styles.featureImg}
            />
          </div>
        </div>

        {/* Item 4: Security (Right Text, Left Image) */}
        <div className={`${styles.zigZagRow} ${styles.rowReverse}`}>
          <div className={styles.zigZagContent}>
            <h2>Enterprise Security</h2>
            <p>End-to-end encryption with per-room token enforcement.</p>
          </div>
          <div className={styles.zigZagVisual}>
            <Image
              src="/images/feature-security.png"
              alt="Security Shield"
              width={600}
              height={400}
              className={styles.featureImg}
            />
          </div>
        </div>
      </section>

      <section className={styles.integrationBanner}>
        <div>
          <h2>Integrations for every workflow</h2>
          <p>
            Push clips to Orbit AI Narration, run Orbit AI Voice, or sync Orbit AI analytics from a single panel.
            More Orbit AI tools keep your workspace superior to the rest.
          </p>
        </div>
        <button className={styles.primaryButton} onClick={() => window.location.assign('/integrations')}>
          View integration tools
        </button>
      </section>
    </main>
  );
}
