import React, { useState, useEffect, useCallback } from 'react';
import StatsPanel from './components/StatsPanel';
import LeadTable from './components/LeadTable';
import ScoreCard from './components/ScoreCard';
import OutreachLog from './components/OutreachLog';
import AnalyticsTab from './components/AnalyticsTab';
import Preloader from './components/Preloader';
import LandingPage from './components/LandingPage';

// Production API base points directly to Northflank, local dev uses Vite proxy
const API_BASE = import.meta.env.DEV ? '/api' : 'https://p01--lead-gen--yg8hh58rzsgq.code.run/api';

const NAV_TABS = [
  { id: 'dashboard', icon: 'ðŸ“Š', label: 'PIPELINE SUMMARY' },
  { id: 'telemetry', icon: 'ðŸ•µï¸', label: 'LEAD TELEMETRY' },
  { id: 'analytics', icon: 'ðŸ“ˆ', label: 'ANALYTICS' },
  { id: 'outreach', icon: 'âœ‰ï¸', label: 'OUTREACH DISPATCH' },
];

export default function App() {
  const [showPreloader, setShowPreloader] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('trovr-theme') || 'midnight');

  // Persist theme choice
  useEffect(() => {
    localStorage.setItem('trovr-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'midnight' ? 'eclipse' : 'midnight');
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [leads, setLeads] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [pipelineStats, setPipelineStats] = useState(null);
  const [pipelineReport, setPipelineReport] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [messagePrompt, setMessagePrompt] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [leadsRes, logsRes, statsRes, pipelineStatsRes, pipelineReportRes, sysStatusRes] = await Promise.all([
        fetch(`${API_BASE}/leads/`),
        fetch(`${API_BASE}/outreach/logs`),
        fetch(`${API_BASE}/reports/summary`),
        fetch(`${API_BASE}/leads/stats`),
        fetch(`${API_BASE}/reports/pipeline-report`),
        fetch(`${API_BASE}/status`),
      ]);

      const leadsData      = await leadsRes.json();
      const logsData       = await logsRes.json();
      const statsData      = await statsRes.json();
      const pStatsData     = await pipelineStatsRes.json();
      const pReportData    = await pipelineReportRes.json();
      const sysData        = await sysStatusRes.json();

      setLeads(Array.isArray(leadsData) ? leadsData : []);
      setLogs(Array.isArray(logsData) ? logsData : []);
      setStats(statsData);
      setPipelineStats(pStatsData);
      setPipelineReport(pReportData);
      setSystemStatus(sysData);
      setLastRefresh(new Date());

      if (leadsData.length > 0 && !selectedLead) {
        setSelectedLead(leadsData[0]);
      }
    } catch (err) {
      console.error('Failed to connect to FastAPI backend:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedLead]);

  // Initial fetch
  useEffect(() => { fetchData(); }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleTriggerPipeline = async () => {
    setPipelineRunning(true);
    try {
      const res = await fetch(`${API_BASE}/leads/trigger-pipeline?limit=4`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'running') {
        let count = 0;
        const interval = setInterval(async () => {
          await fetchData();
          count++;
          if (count >= 4) {
            clearInterval(interval);
            setPipelineRunning(false);
          }
        }, 3000);
      }
    } catch (err) {
      console.error(err);
      setPipelineRunning(false);
    }
  };

  const handleRescoreLead = async (leadId) => {
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}/rescore`, { method: 'POST' });
      const updated = await res.json();
      setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
      if (selectedLead?.id === leadId) setSelectedLead(updated);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerOutreach = async (lead) => {
    let stage = 'day_1_pitch';
    if (lead.outreach_status === 'day_1_pitch') stage = 'day_3_followup';
    else if (lead.outreach_status === 'day_3_followup') stage = 'day_7_breakup';
    try {
      const res = await fetch(`${API_BASE}/outreach/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id, stage }),
      });
      const logEntry = await res.json();
      setMessagePrompt({ leadName: lead.name, message: logEntry.message_body, stage });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateStatus = async (logId, leadId, newStatus) => {
    try {
      await fetch(
        `${API_BASE}/outreach/logs/${logId}/status?lead_id=${leadId}&new_status=${newStatus}`,
        { method: 'POST' }
      );
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Right-panel visibility
  const showRightPanel = activeTab === 'dashboard' || activeTab === 'telemetry';

  if (showPreloader) {
    return <Preloader onComplete={() => setShowPreloader(false)} />;
  }

  if (showLanding) {
    return <LandingPage onEnterDashboard={() => setShowLanding(false)} />;
  }

  return (
    <div
      data-theme={theme}
      className="cyber-hud-container"
      style={{
        display: 'grid',
        gridTemplateColumns: sidebarCollapsed ? '64px 1fr' : '280px 1fr',
        transition: 'grid-template-columns 0.25s ease',
        minHeight: '100vh',
        padding: '20px',
        gap: '20px',
        alignItems: 'start',
      }}
    >

      {/* â”€â”€ Sidebar â”€â”€ */}
      <div
        className="cyber-sidebar"
        style={{
          width: '100%',
          overflow: 'hidden',
          padding: sidebarCollapsed ? '16px 10px' : '24px',
          transition: 'padding 0.25s ease',
        }}
      >
        {/* â”€â”€ Collapse toggle â”€â”€ */}
        <button
          onClick={() => setSidebarCollapsed(prev => !prev)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'none',
            border: '1px solid var(--panel-border)',
            borderRadius: '6px',
            color: 'var(--text-secondary)',
            width: '100%',
            padding: '7px',
            marginBottom: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-end',
            transition: 'all 0.2s ease',
          }}
        >
          {sidebarCollapsed ? 'Â»' : 'Â«'}
        </button>

        {/* â”€â”€ Logo â”€â”€ */}
        <div style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          paddingBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: sidebarCollapsed ? '0' : '11px',
          overflow: 'visible',
          position: 'relative',
        }}>
          {/* Eye icon â€” always visible */}
          <div style={{
            flexShrink: 0,
            width: '38px', height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(129,140,248,0.18), rgba(167,139,250,0.10))',
            border: '1px solid rgba(129,140,248,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(129,140,248,0.18)',
          }}>
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
              <path d="M10 1C5.5 1 1.7 4 1 7c.7 3 4.5 6 9 6s8.3-3 9-6c-.7-3-4.5-6-9-6z"
                stroke="var(--accent-primary)" strokeWidth="1.4" fill="none" strokeLinejoin="round"/>
              <circle cx="10" cy="7" r="2.8" fill="var(--accent-primary)"
                style={{ filter: 'drop-shadow(0 0 4px var(--accent-primary))' }}/>
              <circle cx="8.8" cy="5.8" r="1" fill="white" opacity="0.85"/>
            </svg>
          </div>

          {/* Brand wordmark â€” hidden when sidebar is collapsed */}
          {!sidebarCollapsed && (
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{
                fontFamily: 'var(--font-hud)',
                fontWeight: 800,
                fontSize: '1.25rem',
                letterSpacing: '3px',
                color: '#fff',
                lineHeight: 1.1,
                textShadow: '0 0 20px rgba(129,140,248,0.35)',
              }}>
                trovr
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.52rem',
                letterSpacing: '2.5px',
                color: 'var(--accent-primary)',
                marginTop: '3px',
                opacity: 0.8,
              }}>
                LEAD INTELLIGENCE
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {NAV_TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-${tab.id}`}
                className="cyber-btn"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: active ? 'var(--accent-cyan)' : 'none',
                  color: active ? 'var(--bg-dark)' : '#fff',
                  border: active ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                  boxShadow: active ? '0 0 12px rgba(0,240,255,0.3)' : 'none',
                  fontWeight: active ? '700' : '400',
                }}
              >
                <span style={{ fontSize: sidebarCollapsed ? '1.1rem' : 'inherit' }}>{tab.icon}</span>
                {!sidebarCollapsed && <span>{tab.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Bottom panel */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!sidebarCollapsed && (
            <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
              SYSTEM ORCHESTRATION
            </div>
          )}

          <button
            id="btn-run-scrapers"
            className="cyber-btn cyber-btn-purple"
            onClick={handleTriggerPipeline}
            disabled={pipelineRunning}
            title={sidebarCollapsed ? (pipelineRunning ? 'Scanning...' : 'Run Scrapers') : undefined}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {pipelineRunning ? (
              <>
                <div className="glow-indicator" style={{ background: '#fff', boxShadow: '0 0 8px #fff' }} />
                {!sidebarCollapsed && 'SCANNING...'}
              </>
            ) : (
              <>{sidebarCollapsed ? 'âš¡' : 'âš¡ RUN SCRAPERS'}</>
            )}
          </button>

          <button
            id="btn-refresh"
            className="cyber-btn"
            onClick={fetchData}
            title={sidebarCollapsed ? 'Refresh Data' : undefined}
            style={{ width: '100%', fontSize: '0.7rem', padding: '8px' }}
          >
            {sidebarCollapsed ? 'ðŸ”„' : 'ðŸ”„ REFRESH DATA'}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={`Switch to ${theme === 'midnight' ? 'Eclipse (Emerald)' : 'Midnight (Indigo)'} theme`}
            style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
          >
            <div className="theme-toggle-swatch" style={{
              background: theme === 'midnight'
                ? 'linear-gradient(90deg, #34d399, #22d3ee)'  /* preview eclipse */
                : 'linear-gradient(90deg, #818cf8, #a78bfa)', /* preview midnight */
            }} />
            {!sidebarCollapsed && (
              <span style={{ fontSize: '0.68rem', letterSpacing: '0.8px' }}>
                {theme === 'midnight' ? 'ECLIPSE MODE' : 'MIDNIGHT MODE'}
              </span>
            )}
          </button>

          {!sidebarCollapsed && (

            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', lineHeight: '1.6' }}>
              DATABASE:{' '}
              <span style={{ color: systemStatus?.db_mode === 'supabase' ? '#34d399' : 'var(--accent-cyan)' }}>
                {systemStatus?.db_label || 'CONNECTING...'}
              </span><br />
              LEADS:{' '}
              <span style={{ color: '#fff' }}>{systemStatus?.lead_count ?? 'â€”'}</span><br />
              STATUS: <span style={{ color: '#34d399' }}>SYS_ONLINE</span><br />
              {lastRefresh && (
                <>
                  SYNCED: <span style={{ color: '#fff' }}>{lastRefresh.toLocaleTimeString()}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Main Viewport â”€â”€ */}
      <div className="cyber-main-viewport">

        {/* Loading state */}
        {loading && (
          <div className="cyber-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', borderColor: 'rgba(0,240,255,0.2)' }}>
            <div className="glow-indicator" />
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.78rem', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
              TROVR.AI â€” CONNECTING TO INTELLIGENCE BACKEND...
            </span>
          </div>
        )}

        {/* Pipeline running banner */}
        {pipelineRunning && (
          <div className="cyber-card" style={{ background: 'rgba(0, 240, 255, 0.04)', borderColor: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="glow-indicator" />
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.78rem', color: '#fff', letterSpacing: '1px' }}>
              TROVR.AI PIPELINE ENGAGED â€” SCRAPING X &amp; GITHUB CONTRIBUTORS... FEED UPDATES LIVE.
            </span>
          </div>
        )}

        {/* Outreach confirmation banner */}
        {messagePrompt && (
          <div className="cyber-card card-corner-decor" style={{ borderColor: 'var(--accent-purple)', background: 'rgba(157, 78, 221, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.78rem', color: 'var(--accent-purple)', fontWeight: 'bold', marginBottom: '8px' }}>
                  ðŸš€ DISPATCH SUCCESSFUL â€” {messagePrompt.stage.toUpperCase().replace(/_/g, ' ')}
                </div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: '1.5', maxWidth: '800px' }}>
                  Sent to <strong style={{ color: '#fff' }}>{messagePrompt.leadName}</strong>: "{messagePrompt.message}"
                </div>
              </div>
              <button
                onClick={() => setMessagePrompt(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', flexShrink: 0 }}
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Stats Panel â€” visible on dashboard + analytics */}
        {stats && (activeTab === 'dashboard' || activeTab === 'analytics') && (
          <StatsPanel stats={stats} pipelineStats={pipelineStats} />
        )}

        {/* â”€â”€ Tab Content â”€â”€ */}
        {activeTab === 'analytics' ? (
          <AnalyticsTab pipelineStats={pipelineStats} pipelineReport={pipelineReport} />
        ) : (
          <div
            className="cyber-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: showRightPanel ? 'minmax(0, 1fr) minmax(280px, 380px)' : 'minmax(0, 1fr)',
              gap: '20px',
              flex: 1,
            }}
          >
            {/* Left panel */}
            {(activeTab === 'dashboard' || activeTab === 'telemetry') && (
              <LeadTable
                leads={leads}
                onSelectLead={setSelectedLead}
                onRescoreLead={handleRescoreLead}
                onTriggerOutreach={handleTriggerOutreach}
              />
            )}

            {activeTab === 'outreach' && (
              <OutreachLog
                logs={logs}
                onSimulateStatus={handleSimulateStatus}
              />
            )}

            {/* Right panel â€” Score card */}
            {showRightPanel && (
              <ScoreCard
                lead={selectedLead}
                onClose={() => setSelectedLead(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
