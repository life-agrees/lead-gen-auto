import React, { useState } from 'react';

export default function LeadTable({ leads, onSelectLead, onRescoreLead, onTriggerOutreach }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [minScoreFilter, setMinScoreFilter] = useState(0);

  // Filter leads list
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lead.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.bio.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === 'all' || lead.source.toLowerCase() === sourceFilter.toLowerCase();
    const matchesScore = lead.score >= minScoreFilter;
    return matchesSearch && matchesSource && matchesScore;
  });

  const getScoreClass = (score) => {
    if (score >= 70) return 'score-badge score-high';
    if (score >= 40) return 'score-badge score-medium';
    return 'score-badge score-low';
  };

  return (
    <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Search and Filters bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-hud)', fontSize: '1.1rem', letterSpacing: '1px', textShadow: 'var(--text-glow)', color: '#fff' }}>
          LEAD TELEMETRY FEED
        </h2>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Search box */}
          <input 
            type="text" 
            placeholder="Search keywords/names..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'rgba(5, 7, 15, 0.6)',
              border: '1px solid var(--panel-border)',
              borderRadius: '6px',
              padding: '8px 12px',
              color: '#fff',
              outline: 'none',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.85rem',
              width: '200px'
            }}
          />

          {/* Source dropdown */}
          <select 
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{
              background: 'rgba(5, 7, 15, 0.6)',
              border: '1px solid var(--panel-border)',
              borderRadius: '6px',
              padding: '8px 12px',
              color: '#fff',
              outline: 'none',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.85rem'
            }}
          >
            <option value="all">All Sources</option>
            <option value="twitter">X / Twitter</option>
            <option value="github">GitHub</option>
            <option value="onchain">On-chain</option>
            <option value="discord">Discord</option>
          </select>

          {/* Min score slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            <span>Min Score:</span>
            <input 
              type="range" 
              min="0" 
              max="90" 
              step="10"
              value={minScoreFilter}
              onChange={(e) => setMinScoreFilter(Number(e.target.value))}
              style={{ accentColor: 'var(--accent-cyan)' }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{minScoreFilter}</span>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.15)', color: 'var(--text-secondary)', fontFamily: 'var(--font-hud)', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
              <th style={{ padding: '12px 10px' }}>LEAD SUMMARY</th>
              <th style={{ padding: '12px 10px' }}>SOURCE</th>
              <th style={{ padding: '12px 10px' }}>FIT SCORE</th>
              <th style={{ padding: '12px 10px' }}>CAMPAIGN STAGE</th>
              <th style={{ padding: '12px 10px', textAlign: 'right' }}>PIPELINE OPERATIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => (
              <tr 
                key={lead.id} 
                onClick={() => onSelectLead(lead)}
                style={{ 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)', 
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 240, 255, 0.02)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                {/* Lead Summary Info */}
                <td style={{ padding: '15px 10px' }}>
                  <div style={{ fontWeight: '600', color: '#fff', fontSize: '0.9rem' }}>{lead.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    @{lead.username}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '5px', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lead.bio}
                  </div>
                </td>
                
                {/* Source tag */}
                <td style={{ padding: '15px 10px', verticalAlign: 'middle' }}>
                  <span className={`source-tag tag-${lead.source.toLowerCase()}`}>{lead.source}</span>
                </td>
                
                {/* Fit Score */}
                <td style={{ padding: '15px 10px', verticalAlign: 'middle' }}>
                  <span className={getScoreClass(lead.score)}>{lead.score}%</span>
                </td>
                
                {/* Outreach Status */}
                <td style={{ padding: '15px 10px', verticalAlign: 'middle' }}>
                  <span className={`status-pill status-${lead.outreach_status.toLowerCase()}`}>{lead.outreach_status.replace(/_/g, ' ')}</span>
                </td>
                
                {/* Action buttons */}
                <td style={{ padding: '15px 10px', textAlign: 'right', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      className="cyber-btn"
                      onClick={() => onRescoreLead(lead.id)}
                      style={{ padding: '6px 12px', fontSize: '0.7rem' }}
                    >
                      Rescore
                    </button>
                    {lead.outreach_status !== 'replied' && (
                      <button 
                        className="cyber-btn cyber-btn-purple"
                        onClick={() => onTriggerOutreach(lead)}
                        style={{ padding: '6px 12px', fontSize: '0.7rem' }}
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
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  NO ACTIVE LEADS FIT SELECTED FILTER METRICS
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
