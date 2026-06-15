import React, { useState } from 'react';

export default function OutreachLog({ logs, onSimulateStatus }) {
  const [exporting, setExporting] = useState(false);
  const [exportFilter, setExportFilter] = useState('all');

  const getStatusClass = (status) => {
    const s = (status || 'sent').toLowerCase();
    return `status-pill status-${s}`;
  };

  const formatStage = (stage) => {
    return stage.replace(/_/g, ' ').toUpperCase();
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = exportFilter !== 'all' ? `?status=${exportFilter}` : '';
      const res = await fetch(`/api/outreach/export${params}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'trovr_outreach_export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontFamily: 'var(--font-hud)', fontSize: '1.1rem', letterSpacing: '1px', textShadow: 'var(--text-glow)', color: '#fff', margin: 0 }}>
          OUTREACH DISPATCH LOGS
        </h2>

        {/* Export controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          {/* Status filter */}
          <select
            value={exportFilter}
            onChange={e => setExportFilter(e.target.value)}
            style={{
              background: 'rgba(5,7,15,0.8)',
              border: '1px solid rgba(0,240,255,0.2)',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.68rem',
              padding: '5px 8px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">ALL LOGS</option>
            <option value="sent">SENT ONLY</option>
            <option value="queued">QUEUED ONLY</option>
            <option value="replied">REPLIED ONLY</option>
          </select>

          {/* Download button */}
          <button
            id="btn-export-outreach-csv"
            onClick={handleExport}
            disabled={exporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              background: exporting
                ? 'rgba(0,240,255,0.05)'
                : 'linear-gradient(135deg, rgba(0,240,255,0.12), rgba(139,92,246,0.12))',
              border: '1px solid rgba(0,240,255,0.3)',
              borderRadius: '7px',
              color: exporting ? 'var(--text-secondary)' : 'var(--accent-cyan)',
              fontFamily: 'var(--font-hud)',
              fontSize: '0.7rem',
              letterSpacing: '0.8px',
              padding: '6px 14px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: exporting ? 'none' : '0 0 10px rgba(0,240,255,0.08)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!exporting) e.currentTarget.style.boxShadow = '0 0 18px rgba(0,240,255,0.28)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = exporting ? 'none' : '0 0 10px rgba(0,240,255,0.08)'; }}
          >
            {exporting ? (
              <>
                <div className="glow-indicator" style={{ width: '7px', height: '7px' }} />
                EXPORTING...
              </>
            ) : (
              <>
                {/* Download arrow icon */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                EXPORT TO SHEETS
              </>
            )}
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '600px', overflowY: 'auto' }}>
        {logs.map((log) => (
          <div
            key={log.id || log.sent_at}
            style={{
              background: 'rgba(5, 7, 15, 0.4)',
              border: '1px solid rgba(0, 240, 255, 0.1)',
              borderRadius: '8px',
              padding: '15px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>{log.name || 'Unknown Lead'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginLeft: '10px' }}>
                  @{log.username || 'username'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {formatDate(log.sent_at)}
                </span>
                <span className={getStatusClass(log.status)}>{log.status}</span>
              </div>
            </div>

            {/* Sequence label */}
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-hud)', color: 'var(--accent-cyan)', display: 'flex', gap: '5px' }}>
              SEQUENCE: <span style={{ color: '#fff' }}>{formatStage(log.stage)}</span>
            </div>

            {/* Message preview */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px dashed rgba(255,255,255,0.05)',
              borderRadius: '6px',
              padding: '10px 12px',
              fontSize: '0.8rem',
              color: 'var(--text-primary)',
              lineHeight: '1.4',
              fontStyle: 'italic'
            }}>
              "{log.message_body}"
            </div>

            {/* Simulate receipt actions */}
            {log.status !== 'replied' && onSimulateStatus && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.02)', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginRight: 'auto', alignSelf: 'center' }}>
                  SIMULATE RECEIPT:
                </span>
                {log.status === 'sent' && (
                  <button
                    className="cyber-btn"
                    onClick={() => onSimulateStatus(log.id, log.lead_id, 'opened')}
                    style={{ padding: '4px 10px', fontSize: '0.65rem' }}
                  >
                    Mark Opened
                  </button>
                )}
                <button
                  className="cyber-btn cyber-btn-purple"
                  onClick={() => onSimulateStatus(log.id, log.lead_id, 'replied')}
                  style={{ padding: '4px 10px', fontSize: '0.65rem' }}
                >
                  Simulate Reply
                </button>
              </div>
            )}
          </div>
        ))}

        {logs.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            NO OUTREACH DISPATCH EVENTS RECORDED IN HISTORY
          </div>
        )}
      </div>
    </div>
  );
}
