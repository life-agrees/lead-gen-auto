import React, { useEffect, useRef, useState } from 'react';
import Footer from './Footer';
import TrovrLogo from './TrovrLogo';

// ------- Animated number counter -------
function Counter({ end, suffix = '', duration = 1800 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();
          const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setVal(Math.round(ease * end));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

// ------- Feature card -------
function FeatureCard({ icon, title, body, delay }) {
  return (
    <div className="lp-feature-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="lp-feature-icon">{icon}</div>
      <h3 className="lp-feature-title">{title}</h3>
      <p className="lp-feature-body">{body}</p>
    </div>
  );
}

// ------- Pipeline step -------
function PipelineStep({ num, label, sub, active }) {
  return (
    <div className={`lp-pipe-step ${active ? 'active' : ''}`}>
      <div className="lp-pipe-num">{num}</div>
      <div>
        <div className="lp-pipe-label">{label}</div>
        <div className="lp-pipe-sub">{sub}</div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: '⛓️',
    title: 'On-Chain Signal Scanning',
    body: 'Monitors Polymarket and Azuro wallets across Polygon, Base, Arbitrum and BNB Chain (BSC) in real time. Active wallets = active builders.',
  },
  {
    icon: '🐦',
    title: 'Social Graph Enrichment',
    body: 'Cross-references Twitter bios, follower counts, and GitHub Solidity activity to build a full builder fingerprint.',
  },
  {
    icon: '🧠',
    title: '22-Signal ML Scoring',
    body: 'Every lead is scored out of 100 across 22 weighted signals — wallet age, repo commits, follower density, and more.',
  },
  {
    icon: '✉️',
    title: 'Hyper-Personalized Outreach',
    body: 'AI drafts DMs referencing each lead\'s actual activity — not a generic blast. 3-stage nurture sequences auto-queued.',
  },
  {
    icon: '📊',
    title: 'Live Intelligence Dashboard',
    body: 'Real-time HUD showing every lead\'s status, score, outreach history, and reply signals — all in one cybernetic interface.',
  },
  {
    icon: '🔄',
    title: 'Autonomous Scheduling',
    body: 'Cron-based pipeline that re-discovers, re-scores, and re-targets on a rolling cadence without manual intervention.',
  },
];

const PIPELINE_STEPS = [
  { label: 'DISCOVER', sub: 'On-chain + social scraping' },
  { label: 'ENRICH', sub: 'GitHub · Twitter · ENS' },
  { label: 'SCORE', sub: '22-signal ML model' },
  { label: 'OUTREACH', sub: 'AI-personalized DMs' },
  { label: 'TRACK', sub: 'Open · reply signals' },
];

const STATS = [
  { end: 129, suffix: '', label: 'LEADS FOUND', sub: 'In first pilot run' },
  { end: 8, suffix: '', label: 'HOT LEADS', sub: 'Score ≥ 70 / 100' },
  { end: 16, suffix: '', label: 'DMs SENT', sub: 'Personalized outreach dispatched' },
  { end: 98, suffix: '/100', label: 'AVG HOT SCORE', sub: 'Near-perfect targeting' },
  { end: 22, suffix: '+', label: 'SCORING SIGNALS', sub: 'Multi-source intelligence' },
];

export default function LandingPage({ onEnterDashboard }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveStep(p => (p + 1) % PIPELINE_STEPS.length), 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="lp-root">
      {/* ── NAVBAR ── */}
      <nav className="lp-nav" role="navigation" aria-label="Main navigation">
        <div className="lp-nav-inner">
          <a href="#" className="lp-nav-logo" aria-label="Trovr home">
            <TrovrLogo width={170} filterId="nav-logo-glow" />
          </a>
          <div className="lp-nav-links">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#how-it-works" className="lp-nav-link">How It Works</a>
            <a href="#results" className="lp-nav-link">Results</a>
          </div>
          <button id="lp-enter-dashboard-btn" className="lp-nav-cta" onClick={onEnterDashboard}>
            Open Dashboard →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero" aria-labelledby="hero-heading">
        <div className="lp-hero-bg-grid" />
        <div className="lp-hero-orb lp-orb-1" />
        <div className="lp-hero-orb lp-orb-2" />

        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            <span className="lp-live-pulse" />
            PILOT COMPLETE · 129 LEADS · 16 DMs SENT · 8 HOT
          </div>

          <h1 id="hero-heading" className="lp-hero-h1">
            Lead Intelligence<br />
            <span className="lp-h1-accent">for Web3 Founders</span>
          </h1>

          <p className="lp-hero-sub">
            Scan Polymarket + Azuro on-chain wallets, cross-reference builder signals from Twitter & GitHub,
            then auto-generate hyper-personalized outreach — all scored by a 22-signal ML model.
          </p>

          <div className="lp-hero-ctas">
            <button id="lp-hero-dashboard-btn" className="lp-btn-primary" onClick={onEnterDashboard}>
              Enter Pipeline HUD
            </button>
            <a href="#how-it-works" className="lp-btn-ghost">See How It Works</a>
          </div>

          {/* Live pipeline animation */}
          <div className="lp-hero-pipeline" aria-label="Pipeline steps">
            {PIPELINE_STEPS.map((step, i) => (
              <React.Fragment key={step.label}>
                <div className={`lp-hero-pipe-node ${activeStep === i ? 'active' : activeStep > i ? 'done' : ''}`}>
                  <div className="lp-hpn-dot" />
                  <span className="lp-hpn-label">{step.label}</span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className={`lp-hero-pipe-line ${activeStep > i ? 'lit' : ''}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="lp-stats-band" id="results" aria-label="Pilot results">
        <div className="lp-stats-inner">
          {STATS.map(s => (
            <div key={s.label} className="lp-stat-item">
              <div className="lp-stat-num">
                <Counter end={s.end} suffix={s.suffix} />
              </div>
              <div className="lp-stat-label">{s.label}</div>
              <div className="lp-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-section" id="features" aria-labelledby="features-heading">
        <div className="lp-section-inner">
          <div className="lp-section-header">
            <div className="lp-section-badge">CAPABILITIES</div>
            <h2 id="features-heading" className="lp-section-h2">
              Full-Stack <span className="lp-accent">Lead Intelligence</span>
            </h2>
            <p className="lp-section-sub">
              Every layer of the funnel automated — from discovery to reply tracking.
            </p>
          </div>
          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 80} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-section lp-section-alt" id="how-it-works" aria-labelledby="how-heading">
        <div className="lp-section-inner lp-hiw-inner">
          <div className="lp-hiw-left">
            <div className="lp-section-badge">PIPELINE</div>
            <h2 id="how-heading" className="lp-section-h2">
              How <span className="lp-accent">Trovr</span> Works
            </h2>
            <p className="lp-section-sub">
              A fully autonomous 5-stage pipeline running end-to-end without human input.
            </p>
            <div className="lp-pipe-steps">
              {PIPELINE_STEPS.map((s, i) => (
                <PipelineStep
                  key={s.label}
                  num={String(i + 1).padStart(2, '0')}
                  label={s.label}
                  sub={s.sub}
                  active={activeStep === i}
                />
              ))}
            </div>
          </div>

          {/* Code mock */}
          <div className="lp-hiw-right">
            <div className="lp-code-window">
              <div className="lp-code-titlebar">
                <div className="lp-code-dot red" />
                <div className="lp-code-dot yellow" />
                <div className="lp-code-dot green" />
                <span className="lp-code-filename">trovr_output.json</span>
              </div>
              <pre className="lp-code-body">{`{
  "handle": "@0xbuilder",
  "score": 98,
  "tier": "HOT",
  "signals": {
    "wallet_activity": 0.95,
    "github_commits_30d": 47,
    "twitter_followers": 3200,
    "ens_registered": true,
    "chain": "Base"
  },
  "outreach": {
    "stage": "day_1_pitch",
    "status": "sent",
    "ai_message": "Hey — saw your
    Polymarket wallet hit 7 txns
    this month on Base. Building
    in prediction markets too?"
  }
}`}
              </pre>
              <div className="lp-code-glow-bar" />
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF / TWEET ── */}
      <section className="lp-section" aria-label="Social proof">
        <div className="lp-section-inner lp-cta-inner">
          <div className="lp-tweet-card">
            <div className="lp-tweet-header">
              <div className="lp-tweet-avatar">
                <span>🔭</span>
              </div>
              <div>
                <div className="lp-tweet-name">@trovr_ai</div>
                <div className="lp-tweet-handle">Web3 Lead Intelligence</div>
              </div>
              <svg viewBox="0 0 24 24" fill="#1d9bf0" width="22" height="22" style={{ marginLeft: 'auto' }}>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25z" />
              </svg>
            </div>
            <p className="lp-tweet-body">
              Spent 5 weeks building an AI lead gen system specifically for Web3 founders.<br /><br />
              → Scans Polygon, Base, Arbitrum &amp; BNB Chain wallets<br />
              → Cross-references Twitter + GitHub for builder signals<br />
              → ML-scores leads across 22 signals<br />
              → Generates personalized outreach automatically<br /><br />
              Ran a pilot: <strong>129 leads found, 8 HOT</strong>, avg score <strong>98/100</strong>. <strong>16 DMs sent</strong>.<br /><br />
              First 10 leads free. DM me. 👁️
            </p>
            <div className="lp-tweet-tags">#Web3 #DeFi #BuildInPublic</div>
          </div>

          {/* CTA */}
          <div className="lp-cta-block">
            <h2 className="lp-section-h2">Ready to see your pipeline?</h2>
            <p className="lp-section-sub">
              Open the live HUD and watch Trovr discover, score, and draft outreach in real time.
            </p>
            <button id="lp-bottom-cta-btn" className="lp-btn-primary lp-btn-large" onClick={onEnterDashboard}>
              Launch Pipeline HUD
            </button>
            <p className="lp-cta-note">No setup required · Backend auto-connects to your Supabase instance</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <Footer />
    </div>
  );
}
