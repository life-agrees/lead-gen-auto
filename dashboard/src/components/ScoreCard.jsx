import React from 'react';

export default function ScoreCard({ lead, onClose }) {
  if (!lead) {
    return (
      <div className="cyber-card" style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
        SELECT A LEAD PROFILE TO EXTRACT HUD METRICS
      </div>
    );
  }

  const breakdown = lead.score_breakdown || {
    twitter_influence: 0,
    github_activity: 0,
    onchain_relevance: 0,
    bio_relevance: 0
  };

  const scoreStats = [
    { label: 'X INFLUENCE FACTORS', val: breakdown.twitter_influence, color: 'var(--accent-cyan)' },
    { label: 'GITHUB COMMIT VELOCITY', val: breakdown.github_activity, color: 'var(--accent-purple)' },
    { label: 'ON-CHAIN SMART BALANCES', val: breakdown.onchain_relevance, color: '#34d399' },
    { label: 'ICP BIO RELEVANCE', val: breakdown.bio_relevance, color: '#fb7185' }
  ];

  return (
    <div className="cyber-card card-corner-decor" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,240,255,0.1)', paddingBottom: '15px' }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-hud)', letterSpacing: '1px' }}>
            METRIC DIAGNOSTICS
          </span>
          <h2 style={{ fontFamily: 'var(--font-hud)', fontSize: '1.1rem', color: '#fff', marginTop: '2px' }}>
            {lead.name}
          </h2>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            &times;
          </button>
        )}
      </div>

      {/* Main Score Radial/Indicator */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', background: 'rgba(5, 7, 15, 0.4)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)' }}>COMPOSITE ICP FITNESS</div>
        <div style={{ fontSize: '3rem', fontFamily: 'var(--font-mono)', fontWeight: '900', color: 'var(--accent-cyan)', textShadow: 'var(--text-glow)' }}>
          {lead.score}%
        </div>
        <div className="pipeline-flow-connector" style={{ width: '100%', marginTop: '5px' }} />
      </div>

      {/* Breakdown sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h4 style={{ fontFamily: 'var(--font-hud)', fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
          CRITERIA COEFFICIENT MATRIX
        </h4>

        {scoreStats.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-hud)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
              <span style={{ color: item.color, fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{item.val}%</span>
            </div>
            
            {/* Progress Container */}
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  background: item.color, 
                  height: '100%', 
                  width: `${item.val}%`, 
                  borderRadius: '3px',
                  boxShadow: `0 0 8px ${item.color}`
                }} 
              />
            </div>
          </div>
        ))}
      </div>

      {/* Extracted tabular values */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
        <h4 style={{ fontFamily: 'var(--font-hud)', fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '5px' }}>
          EXTRACTED PROFILE VECTORS
        </h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)' }}>
            <div style={{ color: 'var(--text-secondary)' }}>Followers</div>
            <div style={{ color: '#fff', fontSize: '0.9rem', marginTop: '2px', fontWeight: 'bold' }}>
              {lead.followers_count || lead.followers || 0}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)' }}>
            <div style={{ color: 'var(--text-secondary)' }}>Repositories</div>
            <div style={{ color: '#fff', fontSize: '0.9rem', marginTop: '2px', fontWeight: 'bold' }}>
              {lead.public_repos || 0}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)' }}>
            <div style={{ color: 'var(--text-secondary)' }}>Activity Count</div>
            <div style={{ color: '#fff', fontSize: '0.9rem', marginTop: '2px', fontWeight: 'bold' }}>
              {lead.commits_to_repo || lead.tx_count || 0}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)' }}>
            <div style={{ color: 'var(--text-secondary)' }}>Ethereum Bal</div>
            <div style={{ color: '#fff', fontSize: '0.9rem', marginTop: '2px', fontWeight: 'bold' }}>
              {lead.eth_balance ? `${lead.eth_balance.toFixed(2)} ETH` : '0.00 ETH'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
