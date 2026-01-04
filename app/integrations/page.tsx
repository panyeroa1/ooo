import React from 'react';
import styles from '@/styles/Integrations.module.css';

const tools = [
  {
    title: 'Contextual Gemini Narration',
    description: 'Push translated text to Gemini Live Audio for cinematic, human-like rhythm and minimal delay.',
    icon: '🎤',
  },
  {
    title: 'Cartesia Sonic-3 Voice',
    description: 'Default sonic edge with WAV/PCM precision and emotion-aware generation_config controls.',
    icon: '🎧',
  },
  {
    title: 'Ollama Conversational Polish',
    description: 'Run Gemini 3 Flash prompts that tune output tone before queuing the TTS pipeline.',
    icon: '🤖',
  },
  {
    title: 'Supabase Transcript Gallery',
    description: 'Auto-save feeds with delta tracking so your integration surface can replay every clip.',
    icon: '📚',
  },
  {
    title: 'LiveKit Control Plane',
    description: 'Single broadcaster per room, audio muting, and session persistence across refresh.',
    icon: '🛰️',
  },
  {
    title: 'AI Workflow Automations',
    description: 'Run toolchains to summarize meetings, auto-skip silence, and trigger downstream hooks.',
    icon: '🧠',
  },
];

export default function IntegrationsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.heroIcon}>⚡</span>
            Supercharge your meetings
          </div>
          <h1>Integration suite</h1>
          <p>
            Every AI tool in one place. Pick audio synths, translation engines, and automations that keep your
            experience superior to the rest.
          </p>
        </div>
        <div className={styles.heroAction}>
          <button className={styles.primaryButton}>Connect Cartesia & Gemini</button>
        </div>
      </section>

      <section className={styles.grid}>
        {tools.map((tool) => (
          <article key={tool.title} className={styles.toolCard}>
            <div className={styles.toolIcon}>{tool.icon}</div>
            <h3>{tool.title}</h3>
            <p>{tool.description}</p>
            <button className={styles.linkButton}>Learn more</button>
          </article>
        ))}
      </section>
    </main>
  );
}
