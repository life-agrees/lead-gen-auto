import React, { useState } from 'react';

const API_BASE = import.meta.env.DEV ? '/api' : 'https://p01--lead-gen--yg8hh58rzsgq.code.run/api';

const InfoRow = ({ label, value, color }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '6px 0',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  }}>
    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-hud)', letterSpacing: '0.5px', flexShrink: 0 }}>
      {label}
    </span>
    <span style={{ fontSize: '0.78rem', color: color || '#fff', fontFamily: 'var(--font-mono)', textAlign: 'right', wordBreak: 'break-all' }}>
      {value}
    </span>
  </div>
);

const SignalChip = ({ text, color }) => (
  <div style={{
    background: `${color}12`,
    border: `1px solid ${color}44`,
    borderRadius: '6px',
    padding: '5px 10px',
    fontSize: '0.7rem',
    color: color,
    fontFamily: 'var(--font-mono)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
  }}>
    {text}
  </div>
);

// ── Chain colour map ─────────────────────────────────────────────────────────
const CHAIN_META = {
  polygon:  { color: '#8b5cf6', icon: '⬡', label: 'Polygon' },
  base:     { color: '#3b82f6', icon: '◈', label: 'Base' },
  arbitrum: { color: '#22d3ee', icon: '◆', label: 'Arbitrum' },
  bnb:      { color: '#f59e0b', icon: '◎', label: 'BNB Chain' },
  ethereum: { color: '#a78bfa', icon: '⟠', label: 'Ethereum' },
  optimism: { color: '#ef4444', icon: '◉', label: 'Optimism' },
};
const chainMeta = (name) => CHAIN_META[name?.toLowerCase()] || { color: '#94a3b8', icon: '◌', label: name };

// ── Stage helpers ────────────────────────────────────────────────────────────
const STAGES = [
  { id: 'day_1_pitch',    label: 'DAY 1: PITCH',    short: 'D1', color: 'var(--accent-cyan)' },
  { id: 'day_3_followup', label: 'DAY 3: FOLLOWUP', short: 'D3', color: '#a78bfa' },
  { id: 'day_7_breakup',  label: 'DAY 7: BREAKUP',  short: 'D7', color: '#fb7185' },
];

// ── On-Chain Activity Feed ───────────────────────────────────────────────────
function ChainFeed({ lead }) {
  const raw      = lead.raw_data || {};
  const chains   = raw.chains_active || lead.chains_active || [];
  const contracts = raw.contracts_deployed || [];
  const ens      = raw.ens_name || '';
  const txCount  = raw.tx_count || lead.tx_count || 0;
  const wallet   = lead.wallet_address || '';

  // Build a synthetic timeline from what we know
  const events = [];

  if (ens) {
    events.push({ type: 'identity', label: `ENS registered: ${ens}`, icon: '🏷️', color: 'var(--accent-cyan)', timeLabel: 'Verified identity' });
  }
  if (wallet) {
    events.push({ type: 'wallet', label: `Wallet linked: ${wallet.slice(0,8)}…${wallet.slice(-6)}`, icon: '👛', color: '#a78bfa', timeLabel: 'Active wallet' });
  }
  chains.forEach((chain) => {
    const m = chainMeta(chain);
    events.push({ type: 'chain', label: `Active on ${m.label}`, icon: m.icon, color: m.color, timeLabel: 'Last 30 days' });
  });
  if (txCount > 0) {
    events.push({ type: 'tx', label: `${txCount.toLocaleString()} total on-chain transactions`, icon: '⚡', color: '#34d399', timeLabel: 'Cumulative' });
  }
  contracts.slice(0, 3).forEach((c, i) => {
    events.push({ type: 'contract', label: `Contract deployed: ${String(c).slice(0,10)}…`, icon: '📜', color: '#fb923c', timeLabel: `Deploy #${i + 1}` });
  });

  if (events.length === 0) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
        NO ON-CHAIN ACTIVITY DETECTED.<br />
        <span style={{ fontSize: '0.68rem', opacity: 0.7, marginTop: '6px', display: 'block' }}>
          Run enrichment pipeline to populate wallet signals.
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '14px' }}>
        ON-CHAIN TRANSACTION TIMELINE
      </div>
      {events.map((ev, i) => (
        <div key={i} style={{ display: 'flex', gap: '12px', position: 'relative', paddingBottom: i < events.length - 1 ? '16px' : '0' }}>
          {/* Vertical connector */}
          {i < events.length - 1 && (
            <div style={{
              position: 'absolute', left: '13px', top: '26px',
              width: '1px', height: 'calc(100% - 10px)',
              background: `linear-gradient(to bottom, ${ev.color}55, transparent)`,
            }} />
          )}
          {/* Icon bubble */}
          <div style={{
            width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
            background: `${ev.color}18`, border: `1px solid ${ev.color}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem',
          }}>
            {ev.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.76rem', color: '#fff', fontFamily: 'var(--font-mono)', lineHeight: 1.3 }}>
              {ev.label}
            </div>
            <div style={{ fontSize: '0.64rem', color: ev.color, fontFamily: 'var(--font-hud)', letterSpacing: '0.5px', marginTop: '2px' }}>
              {ev.timeLabel}
            </div>
          </div>
        </div>
      ))}

      {/* Summary chip row */}
      {chains.length > 0 && (
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {chains.map((chain, i) => {
            const m = chainMeta(chain);
            return <SignalChip key={i} text={`${m.icon} ${m.label.toUpperCase()}`} color={m.color} />;
          })}
        </div>
      )}
    </div>
  );
}

// ── Email Outreach Panel ─────────────────────────────────────────────────────
function EmailOutreach({ lead }) {
  const [email, setEmail]       = useState('');
  const [sending, setSending]   = useState(false);
  const [toast, setToast]       = useState(null); // { type: 'success'|'error', msg }

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSend = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/outreach/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id, email: email.trim(), stage: 'day_1_pitch' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', '📧 Email dispatched via Resend');
        setEmail('');
      } else {
        showToast('error', data.detail || '⚠ Send failed — check Resend API key');
      }
    } catch {
      showToast('error', '⚠ Could not reach backend');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
        COLD EMAIL DISPATCH
      </div>

      {/* Context */}
      <div style={{
        background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.12)',
        borderRadius: '8px', padding: '10px 12px',
        fontSize: '0.73rem', color: 'var(--text-secondary)', lineHeight: 1.5,
      }}>
        The AI will craft a personalised cold email referencing{' '}
        <span style={{ color: '#fff' }}>{lead.name}</span>'s on-chain activity,
        ENS identity, and GitHub work — then send via Resend.
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="email"
          placeholder="lead@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !sending && email.trim() && handleSend()}
          style={{
            flex: 1, background: 'rgba(5,7,15,0.7)',
            border: `1px solid ${email.trim() ? 'rgba(0,240,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '7px', color: '#fff',
            fontFamily: 'var(--font-mono)', fontSize: '0.76rem',
            padding: '9px 12px', outline: 'none',
            transition: 'border-color 0.2s',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!email.trim() || sending}
          style={{
            background: !email.trim() || sending
              ? 'rgba(0,240,255,0.06)'
              : 'linear-gradient(135deg, rgba(0,240,255,0.18), rgba(0,240,255,0.08))',
            border: '1px solid rgba(0,240,255,0.3)',
            borderRadius: '7px', color: !email.trim() || sending ? 'var(--text-secondary)' : 'var(--accent-cyan)',
            fontFamily: 'var(--font-hud)', fontSize: '0.68rem', letterSpacing: '0.8px',
            padding: '9px 14px', cursor: !email.trim() || sending ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap', transition: 'all 0.2s',
            boxShadow: email.trim() && !sending ? '0 0 12px rgba(0,240,255,0.15)' : 'none',
          }}
        >
          {sending ? 'SENDING…' : 'SEND →'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', fontSize: '0.76rem',
          fontFamily: 'var(--font-mono)',
          background: toast.type === 'success' ? 'rgba(52,211,153,0.1)' : 'rgba(251,113,133,0.1)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(52,211,153,0.3)' : 'rgba(251,113,133,0.3)'}`,
          color: toast.type === 'success' ? '#34d399' : '#fb7185',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ fontSize: '0.63rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', opacity: 0.6 }}>
        Requires RESEND_API_KEY set in backend .env
      </div>
    </div>
  );
}

// ── 3-Stage Outreach Sequence ────────────────────────────────────────────────
function OutreachSequence({ lead, logs, onTriggerOutreach }) {
  const [activeStage, setActiveStage] = useState('day_1_pitch');
  const [copiedStage, setCopiedStage] = useState(null);

  const leadLogs = (logs || []).filter(l => l.lead_id === lead.id || l.lead_id === String(lead.id));

  const getLogForStage = (stageId) => leadLogs.find(l => l.stage === stageId);

  const isDispatched = (stageId) => !!getLogForStage(stageId);

  const handleCopy = (text, stageId) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedStage(stageId);
      setTimeout(() => setCopiedStage(null), 2000);
    });
  };

  const currentLog = getLogForStage(activeStage);
  const currentStage = STAGES.find(s => s.id === activeStage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
        OUTREACH SEQUENCE PREVIEW
      </div>

      {/* Stage tab bar */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {STAGES.map(stage => {
          const dispatched = isDispatched(stage.id);
          const active = activeStage === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => setActiveStage(stage.id)}
              style={{
                flex: 1, padding: '7px 4px',
                background: active ? `${stage.color}18` : 'rgba(5,7,15,0.4)',
                border: `1px solid ${active ? stage.color : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '7px',
                color: active ? stage.color : 'var(--text-secondary)',
                fontFamily: 'var(--font-hud)', fontSize: '0.6rem', letterSpacing: '0.5px',
                cursor: 'pointer', transition: 'all 0.2s',
                textAlign: 'center', position: 'relative',
                boxShadow: active ? `0 0 10px ${stage.color}22` : 'none',
              }}
            >
              {stage.short}
              {dispatched && (
                <div style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#34d399', border: '1px solid var(--bg-dark)',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Stage label */}
      <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-hud)', color: currentStage?.color, letterSpacing: '0.8px' }}>
        {currentStage?.label}
        {isDispatched(activeStage) && (
          <span style={{ marginLeft: '10px', fontSize: '0.62rem', color: '#34d399' }}>✓ DISPATCHED</span>
        )}
      </div>

      {/* Message body */}
      {currentLog ? (
        <div style={{
          background: 'rgba(5,7,15,0.5)', border: '1px dashed rgba(255,255,255,0.07)',
          borderRadius: '8px', padding: '12px 14px',
          fontSize: '0.76rem', color: 'var(--text-primary)', lineHeight: 1.6,
          fontStyle: 'italic', minHeight: '80px',
        }}>
          "{currentLog.message_body}"
        </div>
      ) : (
        <div style={{
          background: 'rgba(5,7,15,0.3)', border: '1px dashed rgba(255,255,255,0.05)',
          borderRadius: '8px', padding: '14px',
          fontSize: '0.73rem', color: 'var(--text-secondary)', lineHeight: 1.5,
          textAlign: 'center',
        }}>
          Not yet generated.<br />
          <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>Dispatch Day 1 first to unlock the sequence.</span>
        </div>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {currentLog && (
          <button
            onClick={() => handleCopy(currentLog.message_body, activeStage)}
            style={{
              flex: 1, padding: '8px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '7px', color: copiedStage === activeStage ? '#34d399' : 'var(--text-secondary)',
              fontFamily: 'var(--font-hud)', fontSize: '0.65rem', letterSpacing: '0.5px',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {copiedStage === activeStage ? '✓ COPIED' : '📋 COPY DM'}
          </button>
        )}
        {onTriggerOutreach && (
          <button
            onClick={() => onTriggerOutreach(lead)}
            disabled={isDispatched(activeStage)}
            style={{
              flex: 1, padding: '8px',
              background: isDispatched(activeStage)
                ? 'rgba(52,211,153,0.06)'
                : `linear-gradient(135deg, ${currentStage?.color}22, ${currentStage?.color}0a)`,
              border: `1px solid ${isDispatched(activeStage) ? 'rgba(52,211,153,0.2)' : currentStage?.color + '55'}`,
              borderRadius: '7px',
              color: isDispatched(activeStage) ? '#34d399' : currentStage?.color,
              fontFamily: 'var(--font-hud)', fontSize: '0.65rem', letterSpacing: '0.5px',
              cursor: isDispatched(activeStage) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: !isDispatched(activeStage) ? `0 0 10px ${currentStage?.color}18` : 'none',
            }}
          >
            {isDispatched(activeStage) ? '✓ SENT' : '🚀 DISPATCH'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main ScoreCard ───────────────────────────────────────────────────────────
export default function ScoreCard({ lead, onClose, logs, onTriggerOutreach }) {
  const [activeSection, setActiveSection] = useState('overview');

  if (!lead) {
    return (
      <div className="cyber-card" style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', gap: '12px',
        color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
      }}>
        <div style={{ fontSize: '2rem', opacity: 0.3 }}>🎯</div>
        <div style={{ fontSize: '0.78rem', textAlign: 'center', letterSpacing: '1px' }}>
          SELECT A LEAD PROFILE<br />TO EXTRACT HUD METRICS
        </div>
      </div>
    );
  }

  const breakdown = lead.score_breakdown || {};
  const raw = lead.raw_data || {};

  const twitterPoints = (breakdown.twitter_followers_1k || 0) + (breakdown.twitter_followers_5k || 0) + (breakdown.tweeted_keyword_last_30d || 0);
  const githubPoints = (breakdown.has_github || 0) + (breakdown.github_has_solidity || 0);
  const onchainPoints = (breakdown.onchain_active_last_30d || 0) + (breakdown.has_ens || 0) + (breakdown.multiple_chains_active || 0);
  const bioPoints = (breakdown.bio_keyword_match || 0);

  const twitterScore = Math.round((twitterPoints / 50) * 100);
  const githubScore  = Math.round((githubPoints / 25) * 100);
  const onchainScore = Math.round((onchainPoints / 50) * 100);
  const bioScore     = Math.round((bioPoints / 15) * 100);

  const scoreStats = [
    { label: 'X INFLUENCE',    val: breakdown.twitter_influence !== undefined ? breakdown.twitter_influence : twitterScore, color: 'var(--accent-cyan)' },
    { label: 'GITHUB VELOCITY', val: breakdown.github_activity  !== undefined ? breakdown.github_activity  : githubScore,  color: 'var(--accent-purple)' },
    { label: 'ON-CHAIN DEPTH', val: breakdown.onchain_relevance !== undefined ? breakdown.onchain_relevance : onchainScore, color: '#34d399' },
    { label: 'ICP BIO MATCH',  val: breakdown.bio_relevance     !== undefined ? breakdown.bio_relevance     : bioScore,     color: '#fb7185' },
  ];

  const tweets    = raw.recent_tweets || [];
  const repos     = raw.top_repos     || [];
  const chains    = raw.chains_active || lead.chains_active || [];
  const ens       = raw.ens_name      || '';
  const contracts = raw.contracts_deployed || [];
  const hasSolidity = raw.has_solidity || false;
  const txCount   = raw.tx_count      || lead.tx_count      || 0;
  const ethBalance= raw.eth_balance   || lead.eth_balance   || 0;
  const followers = raw.followers_count || lead.followers_count || 0;
  const ghUser    = raw.github_username || lead.github_username || '';
  const wallet    = lead.wallet_address || '';

  const tierColor = lead.score >= 70 ? 'var(--accent-cyan)' : lead.score >= 40 ? '#b388ff' : '#64748b';
  const tierLabel = lead.score >= 70 ? 'HOT'               : lead.score >= 40 ? 'WARM'     : 'COLD';

  const tabs = [
    { id: 'overview',  label: 'METRICS'   },
    { id: 'signals',   label: 'SIGNALS'   },
    { id: 'chain',     label: 'CHAIN FEED' },
    { id: 'sequence',  label: 'SEQUENCE'  },
    { id: 'email',     label: 'EMAIL'     },
  ];

  return (
    <div className="cyber-card card-corner-decor" style={{
      display: 'flex', flexDirection: 'column', gap: '16px',
      position: 'sticky', top: '20px',
      height: 'calc(100vh - 40px)', alignSelf: 'start',
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-hud)', letterSpacing: '1px' }}>
            METRIC DIAGNOSTICS
          </div>
          <h2 style={{ fontFamily: 'var(--font-hud)', fontSize: '1rem', color: '#fff', marginTop: '3px', lineHeight: 1.2 }}>
            {lead.name}
          </h2>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            @{lead.username || lead.twitter_handle}
            {lead.source && (
              <span style={{
                marginLeft: '8px',
                fontFamily: 'var(--font-hud)', fontSize: '0.62rem', fontWeight: '700',
                letterSpacing: '0.8px', padding: '1px 6px', borderRadius: '4px', border: '1px solid',
                ...(lead.source.toLowerCase() === 'twitter' ? { color: '#1d9bf0', borderColor: 'rgba(29,155,240,0.4)', background: 'rgba(29,155,240,0.08)' }
                  : lead.source.toLowerCase() === 'github'  ? { color: '#9d4edd', borderColor: 'rgba(157,78,221,0.4)', background: 'rgba(157,78,221,0.08)' }
                  : lead.source.toLowerCase() === 'onchain' ? { color: '#34d399', borderColor: 'rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.08)' }
                  : { color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)', background: 'rgba(148,163,184,0.06)' })
              }}>
                {lead.source.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              &times;
            </button>
          )}
          <span style={{
            fontFamily: 'var(--font-mono)', fontWeight: '800',
            fontSize: '0.75rem', color: tierColor,
            background: `${tierColor}15`,
            border: `1px solid ${tierColor}44`,
            padding: '2px 8px', borderRadius: '4px',
          }}>
            {tierLabel}
          </span>
        </div>
      </div>

      {/* Composite score */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        background: 'rgba(5, 7, 15, 0.4)', borderRadius: '10px',
        padding: '14px 18px', border: '1px solid rgba(255,255,255,0.03)',
      }}>
        <div>
          <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
            COMPOSITE ICP FITNESS
          </div>
          <div style={{
            fontSize: '2.5rem', fontFamily: 'var(--font-mono)', fontWeight: '900',
            color: tierColor, textShadow: `0 0 12px ${tierColor}44`, lineHeight: 1,
          }}>
            {lead.score}%
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="pipeline-flow-connector" />
        </div>
      </div>

      {/* Tab selector — scrollable on narrow panel */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            style={{
              background: 'none', border: 'none',
              borderBottom: `2px solid ${activeSection === tab.id ? 'var(--accent-cyan)' : 'transparent'}`,
              color: activeSection === tab.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-hud)', fontSize: '0.62rem', letterSpacing: '1px',
              padding: '8px 12px', cursor: 'pointer', transition: 'color 0.2s',
              marginBottom: '-1px', whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — scrollable */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px' }}>

        {/* ── METRICS ── */}
        {activeSection === 'overview' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                CRITERIA COEFFICIENT MATRIX
              </div>
              {scoreStats.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontFamily: 'var(--font-hud)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{ color: item.color, fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                      {item.val}%
                    </span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', height: '5px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      background: item.color, height: '100%',
                      width: `${Math.min(item.val, 100)}%`,
                      borderRadius: '3px', boxShadow: `0 0 6px ${item.color}66`,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '8px' }}>
                EXTRACTED PROFILE VECTORS
              </div>
              {followers > 0 && <InfoRow label="FOLLOWERS"    value={followers.toLocaleString()}                  color="var(--accent-cyan)"    />}
              {lead.public_repos > 0 && <InfoRow label="REPOSITORIES" value={lead.public_repos}                   color="#f0f6fc"               />}
              {txCount > 0    && <InfoRow label="TX COUNT"     value={txCount.toLocaleString()}                   color="#34d399"               />}
              {ethBalance > 0 && <InfoRow label="ETH BALANCE"  value={`${parseFloat(ethBalance).toFixed(4)} ETH`} color="var(--accent-purple)"  />}
              {ghUser         && <InfoRow label="GITHUB"       value={`@${ghUser}`}                               color="#f0f6fc"               />}
              {ens            && <InfoRow label="ENS"          value={ens}                                        color="var(--accent-cyan)"    />}
              {wallet         && <InfoRow label="WALLET"       value={`${wallet.slice(0, 8)}...${wallet.slice(-6)}`} color="#94a3b8"           />}
              {hasSolidity    && <InfoRow label="SOLIDITY"     value="✓ Confirmed on GitHub"                      color="#34d399"               />}
              {chains.length > 0 && <InfoRow label="ACTIVE CHAINS" value={chains.join(', ')}                      color="#fb923c"              />}
              {lead.bio && (
                <div style={{ marginTop: '4px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>
                  "{lead.bio}"
                </div>
              )}
            </div>
          </>
        )}

        {/* ── SIGNALS ── */}
        {activeSection === 'signals' && (
          <>
            {tweets.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                  RECENT TWEETS
                </div>
                {tweets.slice(0, 3).map((t, i) => {
                  const text = typeof t === 'string' ? t : (t.text || '');
                  return (
                    <div key={i} style={{
                      background: 'rgba(29, 161, 242, 0.06)',
                      border: '1px solid rgba(29, 161, 242, 0.2)',
                      borderRadius: '8px', padding: '10px 12px',
                      fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: 1.5,
                    }}>
                      <span style={{ color: '#1da1f2', fontFamily: 'var(--font-mono)', marginRight: '6px', fontSize: '0.7rem' }}>𝕏</span>
                      {text.length > 160 ? text.slice(0, 157) + '...' : text}
                    </div>
                  );
                })}
              </div>
            )}

            {repos.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                  TOP REPOSITORIES
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {repos.slice(0, 5).map((repo, i) => (
                    <SignalChip key={i} text={typeof repo === 'string' ? repo.split('/').pop() : repo} color="#f0f6fc" />
                  ))}
                </div>
              </div>
            )}

            {contracts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                  CONTRACTS DEPLOYED
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {contracts.slice(0, 4).map((c, i) => (
                    <SignalChip key={i} text={`${String(c).slice(0, 8)}...`} color="var(--accent-cyan)" />
                  ))}
                </div>
              </div>
            )}

            {chains.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                  ACTIVE CHAINS
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {chains.map((chain, i) => (
                    <SignalChip key={i} text={chain.toUpperCase()} color="#fb923c" />
                  ))}
                </div>
              </div>
            )}

            {tweets.length === 0 && repos.length === 0 && chains.length === 0 && contracts.length === 0 && (
              <div style={{
                padding: '30px', textAlign: 'center',
                color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
              }}>
                NO ENRICHMENT SIGNALS CAPTURED YET.<br />
                <span style={{ fontSize: '0.68rem', opacity: 0.7, marginTop: '6px', display: 'block' }}>
                  Run enrichment pipeline to populate social + on-chain signals.
                </span>
              </div>
            )}
          </>
        )}

        {/* ── CHAIN FEED ── */}
        {activeSection === 'chain' && (
          <ChainFeed lead={lead} />
        )}

        {/* ── SEQUENCE ── */}
        {activeSection === 'sequence' && (
          <OutreachSequence lead={lead} logs={logs} onTriggerOutreach={onTriggerOutreach} />
        )}

        {/* ── EMAIL ── */}
        {activeSection === 'email' && (
          <EmailOutreach lead={lead} />
        )}

      </div>
    </div>
  );
}
