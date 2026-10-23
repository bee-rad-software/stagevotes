import type { Metadata } from 'next';
import { BookOpen, ExternalLink, LifeBuoy, Mail, PlayCircle } from 'lucide-react';
import SVSidebar from '@/components/layout/SVSidebar';
import styles from './support.module.css';

export const metadata: Metadata = { title: 'Help & Support | StageVotes' };

export default function ContactPage() {
  return (
    <div className="sv-app">
      <SVSidebar />
      <main className="sv-workspace">
        <div className="sv-page">
          <section className={styles.support} aria-labelledby="support-title">
            <div className={styles.heading}>
              <LifeBuoy size={30} aria-hidden="true" />
              <p className={styles.eyebrow}>We are here to help</p>
              <h1 id="support-title">Help &amp; Support</h1>
              <p>Setting up your first show or need a hand during one? Start here.</p>
            </div>
            <div className={styles.grid}>
              <article className={styles.card}>
                <Mail size={26} aria-hidden="true" />
                <h2>Contact support</h2>
                <p>Get help with your account, trial, show setup, or a technical issue.</p>
                <a className={styles.primary} href="mailto:support@stagevotes.com?subject=StageVotes%20support">Email support</a>
                <a className={styles.email} href="mailto:support@stagevotes.com">support@stagevotes.com</a>
              </article>
              <article className={styles.card}>
                <BookOpen size={26} aria-hidden="true" />
                <h2>Set up KaraFun</h2>
                <p>Follow the setup guide to connect KaraFun and test playback before your show.</p>
                <a className={styles.secondary} href="https://www.stagevotes.com/guides/karafun-setup" target="_blank" rel="noopener noreferrer">Open setup guide<ExternalLink size={16} aria-hidden="true" /></a>
              </article>
              <article className={styles.card}>
                <PlayCircle size={26} aria-hidden="true" />
                <h2>See StageVotes in action</h2>
                <p>Watch the demo for a walkthrough of hosting a show and the singer experience.</p>
                <a className={styles.secondary} href="https://youtu.be/YgGknTNxyuQ" target="_blank" rel="noopener noreferrer">Watch the demo<ExternalLink size={16} aria-hidden="true" /></a>
              </article>
            </div>
            <aside className={styles.tip}>
              <strong>Help us troubleshoot faster</strong>
              <p>Include your venue or show name, what you were trying to do, and any error message. A screenshot helps. Never include passwords or secret keys.</p>
              <a href="https://www.stagevotes.com/faq" target="_blank" rel="noopener noreferrer">Browse frequently asked questions<ExternalLink size={14} aria-hidden="true" /></a>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}
