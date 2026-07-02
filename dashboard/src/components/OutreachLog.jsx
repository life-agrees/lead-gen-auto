import React, { useState } from 'react';

export default function OutreachLog({ logs, onSimulateStatus }) {
  const [exporting, setExporting]   = useState(false);
  const [exportFilter, setExportFilter] = useState('all');
  const [syncToast, setSyncToast]   = useState(null);

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
    setSyncToast(null);
    try {
      const params = exportFilter !== 'all' ? `?status=${exportFilter}` : '';
      const res = await fetch(`/api/outreach/export${params}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'trovr_leads_monday_delivery.csv';
      a.click();
      URL.revokeObjectURL(url);
      setSyncToast('success');
      setTimeout(() => setSyncToast(null), 4000);
    } catch (err) {
      console.error('Export error:', err);
      setSyncToast('error');
      setTimeout(() => setSyncToast(null), 4000);
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

          {/* Sync to Google Sheet button */}
          <button
            id="btn-sync-google-sheet"
            onClick={handleExport}
            disabled={exporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              background: exporting
                ? 'rgba(52,211,153,0.05)'
                : 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(34,197,94,0.08))',
              border: `1px solid ${exporting ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.45)'}`,
              borderRadius: '7px',
              color: exporting ? 'var(--text-secondary)' : '#34d399',
              fontFamily: 'var(--font-hud)',
              fontSize: '0.7rem',
              letterSpacing: '0.8px',
              padding: '6px 14px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: exporting ? 'none' : '0 0 12px rgba(52,211,153,0.15)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!exporting) e.currentTarget.style.boxShadow = '0 0 22px rgba(52,211,153,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = exporting ? 'none' : '0 0 12px rgba(52,211,153,0.15)'; }}
          >
            {exporting ? (
              <>
                <div className="glow-indicator" style={{ width: '7px', height: '7px', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
                SYNCING...
              </>
            ) : (
              <>
                {/* Google Sheets icon */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="3" y1="15" x2="21" y2="15"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                </svg>
                SYNC TO GOOGLE SHEET
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sync toast */}
      {syncToast === 'success' && (
        <div style={{
          padding: '10px 16px', borderRadius: '8px',
          background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)',
          color: '#34d399', fontSize: '0.76rem', fontFamily: 'var(--font-mono)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          ✅ Sheet synced — <span style={{ color: 'var(--text-secondary)' }}>trovr_leads_monday_delivery.csv downloaded. Paste into your client's Google Sheet.</span>
        </div>
      )}
      {syncToast === 'error' && (
        <div style={{
          padding: '10px 16px', borderRadius: '8px',
          background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.3)',
          color: '#fb7185', fontSize: '0.76rem', fontFamily: 'var(--font-mono)',
        }}>
          ⚠ Export failed — check backend connection.
        </div>
      )}

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
