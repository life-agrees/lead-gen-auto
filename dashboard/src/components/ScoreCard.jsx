import React, { useState } from 'react';

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

export default function ScoreCard({ lead, onClose }) {
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

  const scoreStats = [
    { label: 'X INFLUENCE', val: breakdown.twitter_influence || 0, color: 'var(--accent-cyan)' },
    { label: 'GITHUB VELOCITY', val: breakdown.github_activity || 0, color: 'var(--accent-purple)' },
    { label: 'ON-CHAIN DEPTH', val: breakdown.onchain_relevance || 0, color: '#34d399' },
    { label: 'ICP BIO MATCH', val: breakdown.bio_relevance || 0, color: '#fb7185' },
  ];

  // Enriched signals
  const tweets      = raw.recent_tweets || [];
  const repos       = raw.top_repos || [];
  const chains      = raw.chains_active || lead.chains_active || [];
  const ens         = raw.ens_name || '';
  const contracts   = raw.contracts_deployed || [];
  const hasSolidity = raw.has_solidity || false;
  const txCount     = raw.tx_count || lead.tx_count || 0;
  const ethBalance  = raw.eth_balance || lead.eth_balance || 0;
  const followers   = raw.followers_count || lead.followers_count || 0;
  const ghUser      = raw.github_username || lead.github_username || '';
  const wallet      = lead.wallet_address || '';

  const tierColor = lead.score >= 70 ? 'var(--accent-cyan)' : lead.score >= 40 ? '#b388ff' : '#64748b';
  const tierLabel = lead.score >= 70 ? 'HOT' : lead.score >= 40 ? 'WARM' : 'COLD';

  const tabs = [
    { id: 'overview', label: 'METRICS' },
    { id: 'signals', label: 'SIGNALS' },
  ];

  return (
    <div className="cyber-card card-corner-decor" style={{
      height: '100%', display: 'flex', flexDirection: 'column', gap: '16px',
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
              <span className={`source-tag tag-${lead.source}`} style={{ marginLeft: '8px' }}>
                {lead.source}
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

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            style={{
              background: 'none', border: 'none',
              borderBottom: `2px solid ${activeSection === tab.id ? 'var(--accent-cyan)' : 'transparent'}`,
              color: activeSection === tab.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-hud)', fontSize: '0.68rem', letterSpacing: '1px',
              padding: '8px 14px', cursor: 'pointer', transition: 'color 0.2s',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {activeSection === 'overview' && (
          <>
            {/* Score breakdown bars */}
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

            {/* Profile vectors grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '8px' }}>
                EXTRACTED PROFILE VECTORS
              </div>
              {followers > 0 && <InfoRow label="FOLLOWERS" value={followers.toLocaleString()} color="var(--accent-cyan)" />}
              {lead.public_repos > 0 && <InfoRow label="REPOSITORIES" value={lead.public_repos} color="#f0f6fc" />}
              {txCount > 0 && <InfoRow label="TX COUNT" value={txCount.toLocaleString()} color="#34d399" />}
              {ethBalance > 0 && <InfoRow label="ETH BALANCE" value={`${parseFloat(ethBalance).toFixed(4)} ETH`} color="var(--accent-purple)" />}
              {ghUser && <InfoRow label="GITHUB" value={`@${ghUser}`} color="#f0f6fc" />}
              {ens && <InfoRow label="ENS" value={ens} color="var(--accent-cyan)" />}
              {wallet && <InfoRow label="WALLET" value={`${wallet.slice(0, 8)}...${wallet.slice(-6)}`} color="#94a3b8" />}
              {hasSolidity && <InfoRow label="SOLIDITY" value="✓ Confirmed on GitHub" color="#34d399" />}
              {chains.length > 0 && <InfoRow label="ACTIVE CHAINS" value={chains.join(', ')} color="#fb923c" />}
              {lead.bio && (
                <div style={{ marginTop: '4px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>
                  "{lead.bio}"
                </div>
              )}
            </div>
          </>
        )}

        {activeSection === 'signals' && (
          <>
            {/* Recent Tweets */}
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

            {/* Top Repos */}
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

            {/* Contracts deployed */}
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

            {/* Active chains */}
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

            {/* Empty state */}
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
      </div>
    </div>
  );
}
