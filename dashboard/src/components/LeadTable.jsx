import React, { useState } from 'react';

// Inline score colors — immune to CSS purge in production builds
const getScoreStyle = (score) => {
  if (score >= 70) return { color: '#00f0ff', border: '1px solid rgba(0,240,255,0.4)', background: 'rgba(0,240,255,0.08)', fontFamily: 'var(--font-mono)', fontWeight: 'bold', padding: '2px 8px', borderRadius: '6px', fontSize: '0.82rem' };
  if (score >= 40) return { color: '#b388ff', border: '1px solid rgba(179,136,255,0.4)', background: 'rgba(179,136,255,0.08)', fontFamily: 'var(--font-mono)', fontWeight: 'bold', padding: '2px 8px', borderRadius: '6px', fontSize: '0.82rem' };
  return { color: '#64748b', border: '1px solid rgba(100,116,139,0.3)', background: 'rgba(100,116,139,0.06)', fontFamily: 'var(--font-mono)', fontWeight: 'bold', padding: '2px 8px', borderRadius: '6px', fontSize: '0.82rem' };
};

// Inline source badge colors — immune to CSS purge in production builds
const getSourceStyle = (source) => {
  const s = (source || '').toLowerCase();
  const base = { fontFamily: 'var(--font-hud)', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.8px', padding: '2px 8px', borderRadius: '4px', border: '1px solid' };
  if (s === 'twitter') return { ...base, color: '#1d9bf0', borderColor: 'rgba(29,155,240,0.4)', background: 'rgba(29,155,240,0.08)' };
  if (s === 'github') return { ...base, color: '#9d4edd', borderColor: 'rgba(157,78,221,0.4)', background: 'rgba(157,78,221,0.08)' };
  if (s === 'onchain') return { ...base, color: '#34d399', borderColor: 'rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.08)' };
  return { ...base, color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)', background: 'rgba(148,163,184,0.06)' };
};

const getTierLabel = (score) => {
  if (score >= 70) return 'HOT';
  if (score >= 40) return 'WARM';
  return 'COLD';
};

const statusToDisplayClass = (status) => {
  if (!status) return 'status-discovered';
  const s = status.toLowerCase();
  if (s.includes('day_')) return 'status-sent';
  if (s === 'replied') return 'status-replied';
  if (s === 'opened') return 'status-opened';
  return 'status-discovered';
};

export default function LeadTable({ leads, onSelectLead, onRescoreLead, onTriggerOutreach }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [minScoreFilter, setMinScoreFilter] = useState(0);
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'

  const filteredLeads = leads
    .filter(lead => {
      const name = (lead.name || '').toLowerCase();
      const username = (lead.username || '').toLowerCase();
      const bio = (lead.bio || '').toLowerCase();
      const matchesSearch = name.includes(searchTerm.toLowerCase()) ||
        username.includes(searchTerm.toLowerCase()) ||
        bio.includes(searchTerm.toLowerCase());
      const matchesSource = sourceFilter === 'all' || (lead.source || '').toLowerCase() === sourceFilter;
      const matchesScore = (lead.score || 0) >= minScoreFilter;
      let matchesTier = true;
      if (tierFilter === 'hot') matchesTier = lead.score >= 70;
      else if (tierFilter === 'warm') matchesTier = lead.score >= 40 && lead.score < 70;
      else if (tierFilter === 'cold') matchesTier = lead.score < 40;
      return matchesSearch && matchesSource && matchesScore && matchesTier;
    })
    .sort((a, b) => sortDir === 'desc' ? (b.score || 0) - (a.score || 0) : (a.score || 0) - (b.score || 0));

  const inputStyle = {
    background: 'rgba(5, 7, 15, 0.6)',
    border: '1px solid var(--panel-border)',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#fff',
    outline: 'none',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.82rem',
  };

  return (
    <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header + filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-hud)', fontSize: '1.05rem', letterSpacing: '1px', textShadow: 'var(--text-glow)', color: '#fff' }}>
          LEAD TELEMETRY FEED
          <span style={{ marginLeft: '10px', fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            [{filteredLeads.length} / {leads.length}]
          </span>
        </h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Search name / keyword..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ ...inputStyle, width: '180px' }}
          />

          {/* Source filter */}
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} style={inputStyle}>
            <option value="all">All Sources</option>
            <option value="twitter">X / Twitter</option>
            <option value="github">GitHub</option>
            <option value="onchain">On-chain</option>
            <option value="discord">Discord</option>
            <option value="dexscreener">DexScreener</option>
          </select>

          {/* Tier filter */}
          <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} style={inputStyle}>
            <option value="all">All Tiers</option>
            <option value="hot">🔥 Hot (≥70)</option>
            <option value="warm">🟣 Warm (40–69)</option>
            <option value="cold">❄️ Cold (&lt;40)</option>
          </select>

          {/* Min score slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
            <span style={{ fontFamily: 'var(--font-hud)', letterSpacing: '0.5px' }}>MIN:</span>
            <input
              type="range"
              min="0"
              max="90"
              step="10"
              value={minScoreFilter}
              onChange={e => setMinScoreFilter(Number(e.target.value))}
              style={{ accentColor: 'var(--accent-cyan)', width: '80px' }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 'bold', minWidth: '24px' }}>
              {minScoreFilter}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '720px' }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid rgba(0, 240, 255, 0.15)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-hud)',
              fontSize: '0.72rem',
              letterSpacing: '0.5px',
            }}>
              <th style={{ padding: '12px 10px' }}>LEAD SUMMARY</th>
              <th style={{ padding: '12px 10px' }}>SOURCE</th>
              <th
                style={{ padding: '12px 10px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
              >
                FIT SCORE {sortDir === 'desc' ? '▼' : '▲'}
              </th>
              <th style={{ padding: '12px 10px' }}>TIER</th>
              <th style={{ padding: '12px 10px' }}>CAMPAIGN STAGE</th>
              <th style={{ padding: '12px 10px', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map(lead => (
              <tr
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 240, 255, 0.025)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {/* Lead info */}
                <td style={{ padding: '14px 10px' }}>
                  <div style={{ fontWeight: '600', color: '#fff', fontSize: '0.88rem' }}>{lead.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    @{lead.username}
                  </div>
                  <div style={{
                    fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px',
                    maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {lead.bio}
                  </div>
                </td>

                {/* Source */}
                <td style={{ padding: '14px 10px', verticalAlign: 'middle' }}>
                  <span style={getSourceStyle(lead.source)}>
                    {(lead.source || '').toUpperCase()}
                  </span>
                </td>

                {/* Score */}
                <td style={{ padding: '14px 10px', verticalAlign: 'middle' }}>
                  <span style={getScoreStyle(lead.score)}>{lead.score}%</span>
                </td>

                {/* Tier */}
                <td style={{ padding: '14px 10px', verticalAlign: 'middle' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 'bold',
                    color: lead.score >= 70 ? 'var(--accent-cyan)' : lead.score >= 40 ? '#b388ff' : '#64748b',
                  }}>
                    {getTierLabel(lead.score)}
                  </span>
                </td>

                {/* Status */}
                <td style={{ padding: '14px 10px', verticalAlign: 'middle' }}>
                  <span className={`status-pill ${statusToDisplayClass(lead.outreach_status)}`}>
                    {(lead.outreach_status || 'discovered').replace(/_/g, ' ')}
                  </span>
                </td>

                {/* Actions */}
                <td style={{ padding: '14px 10px', textAlign: 'right', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      className="cyber-btn"
                      onClick={() => onRescoreLead(lead.id)}
                      style={{ padding: '5px 11px', fontSize: '0.68rem' }}
                      title="Recalculate score"
                    >
                      Rescore
                    </button>
                    {lead.outreach_status !== 'replied' && (
                      <button
                        className="cyber-btn cyber-btn-purple"
                        onClick={() => onTriggerOutreach(lead)}
                        style={{ padding: '5px 11px', fontSize: '0.68rem' }}
                        title="Send next outreach message"
                      >
                        Outreach
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  NO LEADS MATCH THE SELECTED FILTERS
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
