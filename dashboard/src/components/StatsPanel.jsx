import React from 'react';

export default function StatsPanel({ stats }) {
  if (!stats) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
      {/* Total Leads Card */}
      <div className="cyber-card card-corner-decor">
        <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '1px' }}>
          TOTAL LEADS DISCOVERED
        </div>
        <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-mono)', fontWeight: '800', marginTop: '10px', color: '#fff', textShadow: 'var(--text-glow)' }}>
          {stats.total_leads}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div className="glow-indicator" /> Scrapers active on X, GitHub & Wallets
        </div>
      </div>

      {/* Highly Fit Leads */}
      <div className="cyber-card card-corner-decor">
        <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '1px' }}>
          HIGH-FIT LEADS ({'>='}70)
        </div>
        <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-mono)', fontWeight: '800', marginTop: '10px', color: 'var(--accent-cyan)', textShadow: 'var(--text-glow)' }}>
          {stats.highly_fit}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
          Targeted ICP profiles fitting Web3 criteria
        </div>
      </div>

      {/* Average Fit Score */}
      <div className="cyber-card card-corner-decor">
        <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '1px' }}>
          AVERAGE FIT SCORE
        </div>
        <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-mono)', fontWeight: '800', marginTop: '10px', color: 'var(--accent-purple)', textShadow: '0 0 8px var(--accent-glow-purple)' }}>
          {stats.average_score}%
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
          Combined heuristic and ML evaluations
        </div>
      </div>

      {/* Outreach Conversion Rate */}
      <div className="cyber-card card-corner-decor">
        <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '1px' }}>
          OUTREACH CONVERSION
        </div>
        <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-mono)', fontWeight: '800', marginTop: '10px', color: '#34d399', textShadow: '0 0 8px rgba(52, 211, 153, 0.4)' }}>
          {stats.conversion_rate}%
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
          Positive reply ratio from campaigns
        </div>
      </div>
    </div>
  );
}
