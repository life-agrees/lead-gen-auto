import React from 'react';

function StatCard({ label, value, sub, color, accent }) {
  return (
    <div className="cyber-card card-corner-decor" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Accent glow blob */}
      <div style={{
        position: 'absolute', top: '-20px', right: '-20px',
        width: '80px', height: '80px',
        background: accent || 'rgba(0, 240, 255, 0.06)',
        borderRadius: '50%',
        filter: 'blur(25px)',
        pointerEvents: 'none',
      }} />

      <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '1px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '2.5rem', fontFamily: 'var(--font-mono)', fontWeight: '800',
        marginTop: '10px', color: color || '#fff',
        textShadow: color ? `0 0 12px ${color}55` : 'none',
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {sub}
      </div>
    </div>
  );
}

export default function StatsPanel({ stats, pipelineStats }) {
  if (!stats) return null;

  const tiers = pipelineStats?.tiers || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 4 Stat Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        width: '100%'
      }}>
        <StatCard
          label="TOTAL LEADS DISCOVERED"
          value={stats.total_leads}
          color="#fff"
          accent="rgba(0,240,255,0.06)"
          sub={
            <>
              <div className="glow-indicator" />
              Scrapers active on X, GitHub &amp; Wallets
            </>
          }
        />

        <StatCard
          label="HIGH-FIT LEADS (≥70)"
          value={stats.highly_fit}
          color="var(--accent-cyan)"
          accent="rgba(0,240,255,0.08)"
          sub="Targeted ICP profiles fitting Web3 criteria"
        />

        <StatCard
          label="AVERAGE FIT SCORE"
          value={`${stats.average_score}%`}
          color="var(--accent-purple)"
          accent="rgba(157,78,221,0.08)"
          sub="Combined heuristic and ML evaluations"
        />

        <StatCard
          label="OUTREACH CONVERSION"
          value={`${stats.conversion_rate}%`}
          color="#34d399"
          accent="rgba(52,211,153,0.08)"
          sub="Positive reply ratio from campaigns"
        />
      </div>

      {/* Tier mini-bar — placed below the grid to avoid column-stretching bugs */}
      {pipelineStats && stats.total_leads > 0 && (
        <div className="cyber-card" style={{ padding: '16px 24px' }}>
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '10px' }}>
            LEAD TIER HEAT MAP
          </div>

          {/* Stacked bar */}
          <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', gap: '2px' }}>
            {tiers.hot > 0 && (
              <div style={{
                flex: tiers.hot,
                background: 'var(--accent-cyan)',
                boxShadow: '0 0 6px var(--accent-cyan)',
                borderRadius: '4px 0 0 4px',
                transition: 'flex 0.5s ease',
              }} />
            )}
            {tiers.warm > 0 && (
              <div style={{
                flex: tiers.warm,
                background: 'var(--accent-purple)',
                boxShadow: '0 0 6px var(--accent-purple)',
                transition: 'flex 0.5s ease',
              }} />
            )}
            {tiers.cold > 0 && (
              <div style={{
                flex: tiers.cold,
                background: 'rgba(71, 85, 105, 0.6)',
                borderRadius: '0 4px 4px 0',
                transition: 'flex 0.5s ease',
              }} />
            )}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '20px', marginTop: '8px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
            <span>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>● HOT</span> {tiers.hot || 0}
            </span>
            <span>
              <span style={{ color: 'var(--accent-purple)', fontWeight: 'bold' }}>● WARM</span> {tiers.warm || 0}
            </span>
            <span>
              <span style={{ color: '#475569', fontWeight: 'bold' }}>● COLD</span> {tiers.cold || 0}
            </span>
            <span style={{ marginLeft: 'auto' }}>
              TOTAL: <strong style={{ color: '#fff' }}>{stats.total_leads}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
