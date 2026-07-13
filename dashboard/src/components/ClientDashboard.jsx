import React, { useState, useMemo } from 'react';

const CALENDLY_URL = 'https://calendly.com/pndukwe824/trovr-discovery-call';

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectProtocol(lead) {
  const src = [lead.source, lead.bio, lead.twitter_bio, lead.keywords]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (src.includes('polymarket')) return 'Polymarket';
  if (src.includes('pancake'))    return 'PancakeSwap';
  if (src.includes('alpaca'))     return 'Alpaca Finance';
  if (src.includes('azuro'))      return 'Azuro';
  if (src.includes('uniswap'))    return 'Uniswap';
  if (src.includes('aave'))       return 'Aave';
  if (src.includes('defi'))       return 'DeFi';
  return 'On-chain';
}

function buildFallbackMessage(lead) {
  const rawHandle = lead.twitter_handle || lead.name || '';
  const handle    = rawHandle ? `@${rawHandle.replace(/^@/, '')}` : 'there';
  const protocol  = detectProtocol(lead);
  const chain     = lead.chain || lead.network || 'Base';
  return (
    `Hey ${handle}, noticed your wallet has been active on ${protocol} — ` +
    `${chain} chain. We work with projects targeting exactly this kind of user: ` +
    `active on-chain, proven intent. Would love to share what we're seeing. ` +
    `Open to a quick chat?`
  );
}

function getWeekOf() {
  const d   = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function generateCSV(leads, messageMap) {
  const headers = ['Handle', 'Score', 'Tier', 'Protocol', 'Chain', 'Twitter', 'GitHub', 'Message'];
  const rows    = leads.map(l => {
    const msg = messageMap[l.id] || messageMap[l.name] || buildFallbackMessage(l);
    return [
      l.twitter_handle || l.name || '',
      l.score || 0,
      (l.score || 0) >= 70 ? 'HOT' : 'WARM',
      detectProtocol(l),
      l.chain || l.network || '',
      l.twitter_url  || '',
      l.github_url   || '',
      `"${msg.replace(/"/g, '""')}"`,
    ];
  });
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function matchesNiche(lead, niche) {
  if (!niche || niche === 'gen') return true;

  const src = [lead.source, lead.bio, lead.twitter_bio, lead.keywords]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const nicheLower = niche.toLowerCase();

  if (nicheLower === 'defi') {
    return (
      src.includes('defi') ||
      src.includes('aave') ||
      src.includes('uniswap') ||
      src.includes('pancake') ||
      src.includes('compound') ||
      src.includes('protocol') ||
      src.includes('vault') ||
      src.includes('yield') ||
      src.includes('lending')
    );
  }
  if (nicheLower === 'kol') {
    return (lead.followers_count || 0) >= 5000 || lead.source === 'twitter';
  }
  if (nicheLower === 'lp') {
    return (
      src.includes('lp') ||
      src.includes('liquidity') ||
      src.includes('yield') ||
      src.includes('pool') ||
      src.includes('market maker')
    );
  }
  if (nicheLower === 'pred') {
    return (
      src.includes('polymarket') ||
      src.includes('azuro') ||
      src.includes('prediction') ||
      src.includes('betting') ||
      src.includes('forecast')
    );
  }
  if (nicheLower === 'nft') {
    return (
      src.includes('nft') ||
      src.includes('opensea') ||
      src.includes('creator') ||
      src.includes('mint') ||
      src.includes('collection') ||
      src.includes('art')
    );
  }

  return true;
}

// ── Score Bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ score }) {
  const isHot = score >= 70;
  return (
    <div className="cv-score-row">
      <div className="cv-score-track">
        <div
          className="cv-score-fill"
          style={{
            width: `${score}%`,
            background: isHot
              ? 'linear-gradient(90deg, var(--accent-cyan), #34d399)'
              : 'linear-gradient(90deg, #b388ff, #818cf8)',
          }}
        />
      </div>
      <span className="cv-score-label">Fit {score}/100</span>
    </div>
  );
}

// ── Lead Card ─────────────────────────────────────────────────────────────────

function LeadCard({ lead, message }) {
  const [copied, setCopied] = useState(false);

  const isHot    = (lead.score || 0) >= 70;
  const tier     = isHot ? 'HOT' : 'WARM';
  const handle   = lead.twitter_handle
    ? `@${lead.twitter_handle.replace(/^@/, '')}`
    : lead.name || 'Anonymous';
  const protocol = detectProtocol(lead);
  const chain    = lead.chain || lead.network || '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className={`cv-lead-card cv-card-${tier.toLowerCase()}`}>

      {/* ── Card header ── */}
      <div className="cv-card-header">
        <span className={`cv-tier-badge cv-badge-${tier.toLowerCase()}`}>{tier}</span>
        <span className="cv-lead-handle">{handle}</span>
        {(protocol || chain) && (
          <span className="cv-protocol-chip">
            {[protocol, chain].filter(Boolean).join(' · ')}
          </span>
        )}
      </div>

      {/* ── Score bar ── */}
      <ScoreBar score={lead.score || 0} />

      {/* ── Message block ── */}
      <div className="cv-message-block">
        <div className="cv-message-label">
          <span className="cv-msg-dot" />
          READY TO SEND
        </div>
        <p className="cv-message-text">{message}</p>
      </div>

      {/* ── Actions ── */}
      <div className="cv-card-actions">
        <button
          className={`cv-copy-btn ${copied ? 'cv-copied' : ''}`}
          onClick={handleCopy}
        >
          {copied
            ? <><span>✓</span> Copied!</>
            : <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy Message
              </>
          }
        </button>

        {lead.twitter_url && (
          <a href={lead.twitter_url} target="_blank" rel="noopener noreferrer" className="cv-social-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25z"/>
            </svg>
            𝕏 Profile
          </a>
        )}

        {lead.github_url && (
          <a href={lead.github_url} target="_blank" rel="noopener noreferrer" className="cv-social-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ClientDashboard({ leads, logs, isTrialMode, niche, onLogout, theme }) {
  const weekOf = useMemo(() => getWeekOf(), []);
  const activeNiche = niche || 'gen';

  const messageMap = useMemo(() => {
    const map = {};
    (logs || []).forEach(log => {
      if (!log.message_body) return;
      if (log.lead_id)   map[log.lead_id]   = log.message_body;
      if (log.lead_name) map[log.lead_name]  = log.message_body;
    });
    return map;
  }, [logs]);

  // Filter leads based on client niche selection
  const filteredLeads = useMemo(() => {
    return (leads || []).filter(l => matchesNiche(l, activeNiche));
  }, [leads, activeNiche]);

  const hotLeads  = useMemo(() => filteredLeads.filter(l => (l.score || 0) >= 70), [filteredLeads]);
  const warmLeads = useMemo(() => filteredLeads.filter(l => (l.score || 0) >= 40 && (l.score || 0) < 70), [filteredLeads]);

  const handleDownloadCSV = () => {
    const csv  = generateCSV(filteredLeads, messageMap);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `trovr-${activeNiche}-leads-${weekOf.replace(/ /g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const nicheLabels = {
    defi: 'DeFi Protocol',
    kol: 'KOL Outreach',
    lp: 'Liquidity Provider',
    pred: 'Prediction Market',
    nft: 'NFT / Creator',
    gen: 'All Categories'
  };

  return (
    <div className="cv-root" data-theme={theme || 'midnight'}>

      {/* ── Top glow line ── */}
      <div className="cv-top-glow" />

      {/* ── Header ── */}
      <header className="cv-header">
        <div className="cv-header-inner">
          <div className="cv-header-brand">
            {/* Mini Trovr logo mark */}
            <svg viewBox="120 183 86 62" width="34" height="24" style={{ display: 'block', flexShrink: 0 }}>
              <circle cx="163" cy="213" r="24.5" stroke="#25244c" strokeWidth="4" fill="none" />
              <path
                d="M123 222C123 218.06 124.035 214.159 126.045 210.519C128.055 206.88 131.001 203.573 134.716 200.787C138.43 198.001 142.84 195.791 147.693 194.284C152.546 192.776 157.747 192 163 192C168.253 192 173.454 192.776 178.307 194.284C183.16 195.791 187.57 198.001 191.284 200.787C194.999 203.573 197.945 206.88 199.955 210.519C201.965 214.159 203 218.06 203 222"
                stroke="var(--accent-cyan)" strokeWidth="5" strokeLinecap="round" fill="none"
              />
              <circle cx="163" cy="213" r="14" fill="var(--accent-cyan)" />
              <circle cx="158" cy="208" r="3.5" fill="#ffffff" />
            </svg>
            <div>
              <div className="cv-header-title">
                <span className="cv-live-dot" />
                YOUR {activeNiche !== 'gen' ? activeNiche.toUpperCase() + ' ' : ''}LEADS
              </div>
              <div className="cv-header-week">Week of {weekOf} · {nicheLabels[activeNiche] || activeNiche}</div>
            </div>
          </div>

          <div className="cv-header-actions">
            <button className="cv-download-btn" onClick={handleDownloadCSV}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download CSV
            </button>
            <button className="cv-exit-btn" onClick={onLogout}>
              ← Exit
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="cv-body">

        {/* Stats strip */}
        <div className="cv-stats-strip">
          <div className="cv-stat-pill cv-stat-hot">
            <span>🔥</span> {hotLeads.length} HOT
          </div>
          <div className="cv-stat-pill cv-stat-warm">
            <span>🌡</span> {warmLeads.length} WARM
          </div>
          <div className="cv-stat-pill cv-stat-total">
            {filteredLeads.length} Leads Total
          </div>
        </div>

        {/* Trial banner */}
        {isTrialMode && (
          <div className="cv-trial-banner">
            <div className="cv-trial-info">
              <span className="cv-trial-tag">TRIAL</span>
              <span>Showing your first 10 pilot leads — messages are ready to copy and send</span>
            </div>
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="cv-upgrade-link">
              Upgrade for Full Access →
            </a>
          </div>
        )}

        {/* Lead cards */}
        <div className="cv-leads-list">
          {filteredLeads.length === 0 ? (
            <div className="cv-empty-state">
              <div className="cv-empty-icon">⬡</div>
              <div className="cv-empty-title">Your {nicheLabels[activeNiche] || activeNiche} leads are being prepared</div>
              <div className="cv-empty-sub">
                We'll notify you when your first batch is ready.<br />
                Usually within 24–48 hours of onboarding.
              </div>
              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="cv-upgrade-link"
                style={{ marginTop: '24px', display: 'inline-block' }}
              >
                Talk to the Team →
              </a>
            </div>
          ) : (
            filteredLeads.map((lead, i) => {
              const message =
                messageMap[lead.id]   ||
                messageMap[lead.name] ||
                buildFallbackMessage(lead);
              return <LeadCard key={lead.id || i} lead={lead} message={message} />;
            })
          )}
        </div>

        {/* Footer */}
        <div className="cv-footer">
          Leads refresh weekly · Messages are AI-drafted and ready to send · Questions?{' '}
          <a href="https://x.com/gettrovr" target="_blank" rel="noopener noreferrer">
            DM @gettrovr on X
          </a>
        </div>
      </div>
    </div>
  );
}
