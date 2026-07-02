import React, { useEffect, useRef, useState } from 'react';
import Footer from './Footer';
import TrovrLogo from './TrovrLogo';

const CALENDLY_URL = 'https://calendly.com/pndukwe824/trovr-discovery-call';

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
    body: 'Scans Polymarket, Azuro, PancakeSwap, and Alpaca Finance wallets across Polygon, Base, Arbitrum, and BNB Chain. Targets real builders and LPs with active balances.',
  },
  {
    icon: '🔍',
    title: 'DexScreener Ingestion',
    body: 'Automatically ingests newly launched tokens and contracts to identify emerging builders and project founders the moment they deploy.',
  },
  {
    icon: '🧠',
    title: '22-Signal ML Scoring',
    body: 'Every lead is scored 0–100 across 22 weighted signals—including wallet age, Twitter followers, GitHub commit density, and Solidity repo matches.',
  },
  {
    icon: '✉️',
    title: 'Personalized DM Sequences',
    body: 'AI writes custom DMs referencing actual on-chain transactions, ENS names, and Git activity. Day 1, Day 3, and Day 7 nurture sequences generated automatically.',
  },
  {
    icon: '📅',
    title: 'Weekly Monday Delivery',
    body: 'Receive a clean Google Sheet every Monday with all hot/warm leads, on-chain metrics, and pre-written outreach ready to copy-paste and send.',
  },
  {
    icon: '🔄',
    title: 'Autonomous Pipeline',
    body: 'Runs 100% autonomously: discovers, enriches, scores, and draft-targets without requiring any manual setup or maintenance.',
  },
];

const PIPELINE_STEPS = [
  { label: 'DISCOVER', sub: 'On-chain + DexScreener + Twitter' },
  { label: 'ENRICH', sub: 'GitHub Solidity · ENS · Twitter profile' },
  { label: 'SCORE', sub: '22-signal ML model (HOT/WARM/COLD)' },
  { label: 'OUTREACH', sub: 'AI DMs referencing wallet txs' },
  { label: 'DELIVER', sub: 'Google Sheet every Monday morning' },
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

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div 
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '20px 24px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ 
        color: '#fff', 
        fontWeight: 600, 
        fontSize: '0.97rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        userSelect: 'none'
      }}>
        <span>{q}</span>
        <span style={{ 
          color: 'var(--accent-cyan)', 
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          fontSize: '1rem',
          lineHeight: 1
        }}>❯</span>
      </div>
      {open && (
        <div style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.9rem', 
          lineHeight: 1.7,
          marginTop: '12px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          paddingTop: '12px',
        }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function LandingPage({ onEnterDashboard, onClientLogin }) {
  const [activeStep, setActiveStep] = useState(0);
  const [liveStats, setLiveStats] = useState(FALLBACK_STATS);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [loginError, setLoginError] = useState(false);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (accessCode === 'trovr2026') {
      onClientLogin();
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 500);
    }
  };

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
            <a href="#pricing" className="lp-nav-link">Pricing</a>
            <a href="#faq" className="lp-nav-link">FAQ</a>
            <a
              href="https://x.com/gettrovr"
              target="_blank"
              rel="noopener noreferrer"
              className="lp-nav-link"
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25z" />
              </svg>
              @gettrovr
            </a>

            {/* Client login — subtle, right side */}
            <button
              onClick={() => setShowLoginModal(true)}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                padding: '6px 14px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'border-color 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                e.currentTarget.style.color = 'var(--accent-cyan)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              Client Login
            </button>
          </div>
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="lp-nav-cta"
          >
            Book Discovery Call →
          </a>
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
            LIVE · ON-CHAIN TRANSACTION INTENT SCANNED DAILY
          </div>

          <h1 id="hero-heading" className="lp-hero-h1">
            Stop Buying Cold Lists.<br />
            <span className="lp-h1-accent">Target Active Web3 Users & LPs</span>
          </h1>

          <p className="lp-hero-sub" style={{ maxWidth: '580px' }}>
            Trovr finds the specific wallets, builders, and liquidity providers who have already proven — through real on-chain transactions on Polymarket, Azuro, PancakeSwap, or Alpaca Finance — that they care about what you are building. Get a clean Google Sheet with personalized outreach every Monday.
          </p>

          <div className="lp-hero-ctas">
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="lp-btn-primary"
            >
              Book a Free Discovery Call →
            </a>
            <a href="#how-it-works" className="lp-btn-ghost">See How It Works</a>
          </div>
          <p style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            marginTop: '8px',
            textAlign: 'center',
            width: '100%'
          }}>
            Questions?{' '}
            <a
              href="https://x.com/gettrovr"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}
            >
              DM @gettrovr on X
            </a>
          </p>

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
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="lp-btn-primary lp-btn-large"
            >
              Book a Free Discovery Call →
            </a>
            <p className="lp-cta-note">
              No credit card required · 30 min · Free
            </p>
          </div>
        </div>
      </section>

      {/* ── PRICING PLANS ── */}
      <section className="lp-section lp-section-alt" id="pricing" aria-labelledby="pricing-heading">
        <div className="lp-section-inner">
          <div className="lp-section-header">
            <div className="lp-section-badge">PRICING</div>
            <h2 id="pricing-heading" className="lp-section-h2">
              Simple, <span className="lp-accent">Value-Driven Plans</span>
            </h2>
            <p className="lp-section-sub">
              Your first 10 leads are 100% free. Upgrade as your pipeline scales.
            </p>
          </div>

          <div className="lp-pricing-grid">
            <div className="lp-pricing-card">
              <div>
                <h3 className="lp-pricing-title">Free Sample</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                  Test the pipeline and get a small taste of high-intent Web3 leads.
                </p>
                <div className="lp-pricing-cost">
                  <span className="lp-pricing-price">$0</span>
                  <span className="lp-pricing-setup">No setup fee</span>
                </div>
                <ul className="lp-pricing-features">
                  <li className="lp-pricing-feature">10 scored leads</li>
                  <li className="lp-pricing-feature">Personalized AI DMs</li>
                  <li className="lp-pricing-feature">No credit card required</li>
                  <li className="lp-pricing-feature">Instant dashboard access</li>
                </ul>
              </div>
              <a
                href="https://x.com/gettrovr"
                target="_blank"
                rel="noopener noreferrer"
                className="lp-pricing-btn lp-pricing-btn-secondary"
              >
                DM @gettrovr on X
              </a>
            </div>

            <div className="lp-pricing-card popular">
              <div className="lp-pricing-badge">MOST POPULAR</div>
              <div>
                <h3 className="lp-pricing-title">Starter</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                  A solid pipeline of active builders and wallets delivered weekly.
                </p>
                <div className="lp-pricing-cost">
                  <span className="lp-pricing-price">$400<span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/mo</span></span>
                  <span className="lp-pricing-setup">+$300 setup fee</span>
                </div>
                <ul className="lp-pricing-features">
                  <li className="lp-pricing-feature"><strong>50 hot leads</strong> / month</li>
                  <li className="lp-pricing-feature">Polymarket + Azuro scanning</li>
                  <li className="lp-pricing-feature">PancakeSwap + Alpaca scanning</li>
                  <li className="lp-pricing-feature">Weekly Monday Google Sheet delivery</li>
                  <li className="lp-pricing-feature">Full AI DM personalization</li>
                </ul>
              </div>
              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-pricing-btn lp-pricing-btn-primary"
              >
                Book a Call →
              </a>
            </div>

            <div className="lp-pricing-card">
              <div>
                <h3 className="lp-pricing-title">Growth</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                  For teams seeking deep coverage and customized protocol tracking.
                </p>
                <div className="lp-pricing-cost">
                  <span className="lp-pricing-price">$600<span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/mo</span></span>
                  <span className="lp-pricing-setup">+$500 setup fee</span>
                </div>
                <ul className="lp-pricing-features">
                  <li className="lp-pricing-feature"><strong>100 hot leads</strong> / month</li>
                  <li className="lp-pricing-feature">Custom keyword & contract tracking</li>
                  <li className="lp-pricing-feature">Weekly Monday Google Sheet delivery</li>
                  <li className="lp-pricing-feature">AI DM Day 1 / 3 / 7 sequences</li>
                  <li className="lp-pricing-feature">Dedicated Discord / Slack channel</li>
                </ul>
              </div>
              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-pricing-btn lp-pricing-btn-secondary"
              >
                Book a Call →
              </a>
            </div>
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
                q: 'How does Trovr discover these leads?',
                a: 'We monitor active smart contracts (such as PancakeSwap, Alpaca Finance, Polymarket, or Azuro) across Base, Polygon, Arbitrum, and BNB Chain. If a wallet interacts with these contracts with real capital in the last 30 days, we extract the signal and match it to a social profile.',
              },
              {
                q: 'How are the leads and outreach messages delivered?',
                a: 'Every Monday morning, you receive a clean Google Sheet with all hot/warm leads, their specific on-chain transactions, linked ENS/GitHub profiles, and pre-written Day 1 / 3 / 7 outreach DMs ready to copy-paste.',
              },
              {
                q: 'How is this different from generic lead lists?',
                a: 'Everyone else scrapes static Twitter lists or keywords. Trovr cross-references actual wallet activity. A lead who has completed 7 prediction market trades in the last month is a proven high-intent user, not a random cold contact.',
              },
              {
                q: 'Do you offer a free sample?',
                a: 'Yes. You can claim a free sample of 10 qualified leads with pre-written DMs. No credit card is required, and you can upgrade to Starter or Growth plans as you scale.',
              },
            ].map(({ q, a }) => (
              <FAQItem key={q} q={q} a={a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <Footer />

      {/* ── CLIENT LOGIN MODAL ── */}
      {showLoginModal && (
        <div 
          className="lp-fade-in"
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(6, 8, 17, 0.88)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowLoginModal(false);
            setAccessCode('');
            setLoginError(false);
          }}
        >
          <form 
            onSubmit={handleLoginSubmit}
            onClick={e => e.stopPropagation()}
            className={loginError ? 'shake' : ''}
            style={{
              background: 'var(--panel-bg, #0f1326)',
              border: '1px solid var(--panel-border, rgba(255,255,255,0.08))',
              borderRadius: '16px',
              padding: '36px',
              width: '90%',
              maxWidth: '380px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.85), 0 0 30px rgba(29, 155, 240, 0.1)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Top neon glow line */}
            <div style={{
              position: 'absolute',
              top: -1, left: '10%', right: '10%', height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--accent-cyan, #00f0ff), transparent)'
            }} />
            
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-hud)', marginBottom: '8px', letterSpacing: '1px' }}>
                CLIENT PORTAL
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: 0 }}>
                Enter access code to enter pipeline HUD
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="password"
                placeholder="••••••••"
                value={accessCode}
                onChange={e => setAccessCode(e.target.value)}
                autoFocus
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: loginError ? '1px solid #ff5f56' : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '12px 14px',
                  fontSize: '0.95rem',
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'center',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
              {loginError && (
                <span style={{ color: '#ff5f56', fontSize: '0.72rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                  ACCESS DENIED: INVALID CODE
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowLoginModal(false);
                  setAccessCode('');
                  setLoginError(false);
                }}
                style={{
                  flex: 1,
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  padding: '12px',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  flex: 1,
                  background: 'var(--accent-primary)',
                  border: '1px solid var(--accent-primary)',
                  borderRadius: '6px',
                  color: 'var(--bg-dark, #0b0e1a)',
                  padding: '12px',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 0 15px var(--accent-primary)';
                  e.currentTarget.style.filter = 'brightness(1.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.filter = 'none';
                }}
              >
                Access HUD →
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
