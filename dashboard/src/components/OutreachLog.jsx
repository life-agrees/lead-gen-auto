import React from 'react';

export default function OutreachLog({ logs, onSimulateStatus }) {
  const getStatusClass = (status) => {
    return `status-pill status-${status.toLowerCase()}`;
  };

  const formatStage = (stage) => {
    return stage.replace(/_/g, ' ').toUpperCase();
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString();
  };

  return (
    <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ fontFamily: 'var(--font-hud)', fontSize: '1.1rem', letterSpacing: '1px', textShadow: 'var(--text-glow)', color: '#fff' }}>
        OUTREACH DISPATCH LOGS
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxH: '500px', overflowY: 'auto' }}>
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
            {/* Header info */}
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

            {/* Campaign info */}
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

            {/* Simulated actions bar */}
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
