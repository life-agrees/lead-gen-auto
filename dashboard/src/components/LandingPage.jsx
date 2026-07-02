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

const API_BASE = import.meta.env.DEV
  ? '/api'
  : 'https://p01--lead-gen--yg8hh58rzsgq.code.run/api';

const FALLBACK_STATS = [
  { end: 129, suffix: '', label: 'LEADS FOUND', sub: 'And growing in real time' },
  { end: 8,   suffix: '', label: 'HOT LEADS', sub: 'Score ≥ 70 / 100' },
  { end: 16,  suffix: '', label: 'DMs SENT', sub: 'Personalized outreach dispatched' },
  { end: 98,  suffix: '/100', label: 'AVG HOT SCORE', sub: 'Near-perfect targeting' },
  { end: 22,  suffix: '+', label: 'SCORING SIGNALS', sub: 'Multi-source intelligence' },
];

export default function LandingPage({ onEnterDashboard }) {
  const [activeStep, setActiveStep] = useState(0);
  const [liveStats, setLiveStats] = useState(FALLBACK_STATS);

  // Animate pipeline steps
  useEffect(() => {
    const t = setInterval(() => setActiveStep(p => (p + 1) % PIPELINE_STEPS.length), 1400);
    return () => clearInterval(t);
  }, []);

  // Fetch live stats from the real DB on mount
  useEffect(() => {
    fetch(`${API_BASE}/reports/summary`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const totalLeads   = data.total_leads     ?? FALLBACK_STATS[0].end;
        const hotLeads     = data.highly_fit      ?? FALLBACK_STATS[1].end;
        const dmsContacted = data.funnel_metrics?.contacted ?? FALLBACK_STATS[2].end;
        const avgScore     = data.average_hot_score ?? data.average_score ?? FALLBACK_STATS[3].end;

        // Only update if the DB actually has meaningful data
        if (totalLeads > 0) {
          setLiveStats([
            { end: totalLeads,   suffix: '',     label: 'LEADS FOUND',     sub: 'And growing in real time' },
            { end: hotLeads,     suffix: '',     label: 'HOT LEADS',       sub: 'Score ≥ 70 / 100' },
            { end: dmsContacted, suffix: '',     label: 'DMs SENT',        sub: 'Personalized outreach dispatched' },
            { end: Math.round(avgScore), suffix: '/100', label: 'AVG HOT SCORE', sub: 'Near-perfect targeting' },
            { end: 22,           suffix: '+',    label: 'SCORING SIGNALS', sub: 'Multi-source intelligence' },
          ]);
        }
      })
      .catch(() => { /* silently keep fallback numbers */ });
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
            <a href="#faq" className="lp-nav-link">FAQ</a>
            <a href="https://x.com/gettrovr" target="_blank" rel="noopener noreferrer" className="lp-nav-link" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25z" /></svg>
              @gettrovr
            </a>
          </div>
          <button id="lp-enter-dashboard-btn" className="lp-nav-cta" onClick={onEnterDashboard}>
            Get My First 10 Leads Free →
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
            LIVE · WEB3 FOUNDERS SELLING TO BUILDERS
          </div>

          <h1 id="hero-heading" className="lp-hero-h1">
            Stop Wasting Hours<br />
            <span className="lp-h1-accent">Hunting Web3 Leads Manually</span>
          </h1>

          <p className="lp-hero-sub" style={{ maxWidth: '560px' }}>
            Built for Web3 founders selling dev tools, infra, or B2B SaaS to builders.<br />
            Trovr scans 4 blockchains + Twitter + GitHub, scores every builder across 22 signals,
            and writes your DM — in under 60 seconds.
          </p>

          <div className="lp-hero-ctas">
            <button id="lp-hero-dashboard-btn" className="lp-btn-primary" onClick={onEnterDashboard}>
              See My First 10 Leads Free →
            </button>
            <a href="#how-it-works" className="lp-btn-ghost">Watch How It Works</a>
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
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="lp-section-badge" style={{ display: 'inline-block', marginBottom: '10px' }}>REAL RESULTS</div>
          <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            What One Pilot Run Produced — In 48 Hours
          </h2>
        </div>
        <div className="lp-stats-inner">
          {liveStats.map(s => (
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
          <a
            href="https://x.com/gettrovr"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', display: 'block' }}
          >
          <div className="lp-tweet-card" style={{ cursor: 'pointer', transition: 'transform 0.18s ease, box-shadow 0.18s ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(29,155,240,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
          >
            <div className="lp-tweet-header">
              <div className="lp-tweet-avatar">
                <span>🔭</span>
              </div>
              <div>
                <div className="lp-tweet-name">@gettrovr</div>
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
          </a>


          {/* CTA */}
          <div className="lp-cta-block">
            <h2 className="lp-section-h2">Your first 10 leads are free.</h2>
            <p className="lp-section-sub">
              No credit card. No setup. Just open the HUD and watch Trovr discover,
              score, and draft outreach for real Web3 builders — in real time.
            </p>
            <button id="lp-bottom-cta-btn" className="lp-btn-primary lp-btn-large" onClick={onEnterDashboard}>
              See My First 10 Leads Free →
            </button>
            <p className="lp-cta-note">No credit card required · Takes under 60 seconds</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="lp-section" id="faq" aria-labelledby="faq-heading">
        <div className="lp-section-inner" style={{ maxWidth: '720px' }}>
          <div className="lp-section-header">
            <div className="lp-section-badge">FAQ</div>
            <h2 id="faq-heading" className="lp-section-h2">Common Questions</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            {[
              {
                q: 'Does this only work for prediction market projects?',
                a: 'No. The on-chain scanner targets active wallet builders across Polygon, Base, Arbitrum, and BNB Chain — useful for any Web3 B2B product. The scoring model identifies active builders, not just prediction market users.',
              },
              {
                q: 'Is my data or my leads\' data private?',
                a: 'All data is stored in your own Supabase instance. Trovr never stores lead data on shared servers. Wallet addresses are used only for scoring — they are never sold or shared.',
              },
              {
                q: 'How is this different from Apollo or Hunter?',
                a: 'Apollo and Hunter find email addresses from company databases. Trovr finds active Web3 builders from on-chain activity and GitHub commits — people who are actively building right now, not just listed in a directory.',
              },
              {
                q: 'What chains does Trovr scan?',
                a: 'Polygon, Base, Arbitrum, and BNB Chain (BSC) — with ENS resolution on Ethereum mainnet. More chains are on the roadmap.',
              },
            ].map(({ q, a }) => (
              <div key={q} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '20px 24px',
              }}>
                <div style={{ color: '#fff', fontWeight: 600, marginBottom: '8px', fontSize: '0.97rem' }}>{q}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <Footer />
    </div>
  );
}
