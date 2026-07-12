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
  { id: 'dashboard', icon: '📊', label: 'PIPELINE SUMMARY' },
  { id: 'telemetry', icon: '🕵️', label: 'LEAD TELEMETRY' },
  { id: 'analytics', icon: '📈', label: 'ANALYTICS' },
  { id: 'outreach', icon: '✉️', label: 'OUTREACH DISPATCH' },
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
    return (
      <LandingPage
        onEnterDashboard={() => setShowLanding(false)}
        onClientLogin={() => {
          // For now just enters dashboard
          // Later this becomes a real auth gate
          setShowLanding(false);
        }}
      />
    );
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

      {/* ── Sidebar ── */}
      <div
        className="cyber-sidebar"
        style={{
          width: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: sidebarCollapsed ? '16px 10px' : '24px',
          transition: 'padding 0.25s ease',
        }}
      >
        {/* ── Collapse toggle ── */}
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
          {sidebarCollapsed ? '»' : '«'}
        </button>

                {/* ── Logo (eye icon always visible, wordmark hidden when collapsed) ── */}
        <div className="cyber-logo" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '16px', marginBottom: '4px', overflow: 'visible' }}>
          <svg
            className="cyber-logo-svg"
            viewBox={sidebarCollapsed ? "120 183 86 62" : "100 175 295 78"}
            width="100%"
            height={sidebarCollapsed ? '54px' : '58px'}
            style={{ display: 'block', overflow: 'visible' }}
          >
            <defs>
              <filter id="logo-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Outermost arch (steel blue/purple) */}
            <path
              d="M111 228C111 222.484 112.345 217.023 114.958 211.927C117.572 206.832 121.402 202.202 126.23 198.302C131.059 194.401 136.792 191.308 143.1 189.197C149.409 187.086 156.171 186 163 186C169.829 186 176.591 187.086 182.9 189.197C189.208 191.308 194.941 194.401 199.77 198.302C204.598 202.202 208.428 206.832 211.042 211.927C213.655 217.023 215 222.484 215 228"
              stroke="#5c659e"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
              style={{ opacity: 0.6 }}
            />
            {/* Eyeball Circle */}
            <circle
              cx="163"
              cy="213"
              r="24.5"
              stroke="#25244c"
              strokeWidth="4"
              fill="none"
            />
            {/* Inner arch / Top eyelid (bright glowing light-blue) */}
            <path
              d="M123 222C123 218.06 124.035 214.159 126.045 210.519C128.055 206.88 131.001 203.573 134.716 200.787C138.43 198.001 142.84 195.791 147.693 194.284C152.546 192.776 157.747 192 163 192C168.253 192 173.454 192.776 178.307 194.284C183.16 195.791 187.57 198.001 191.284 200.787C194.999 203.573 197.945 206.88 199.955 210.519C201.965 214.159 203 218.06 203 222"
              stroke="var(--accent-cyan)"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              filter="url(#logo-glow)"
            />
            {/* Pupil (glowing light-blue) */}
            <circle
              cx="163"
              cy="213"
              r="14"
              fill="var(--accent-cyan)"
              filter="url(#logo-glow)"
            />
            {/* Pupil highlight */}
            <circle
              cx="158"
              cy="208"
              r="3.5"
              fill="#ffffff"
              style={{ opacity: 0.95 }}
            />
            {/* "trovr" text — hidden when collapsed */}
            {!sidebarCollapsed && (
            <path
              d="M239.56 188.273V193.386H221.683V188.273H239.56ZM226.477 180.432H232.848V211.391C232.848 212.626 233.033 213.557 233.402 214.182C233.771 214.793 234.247 215.212 234.83 215.439C235.426 215.652 236.072 215.759 236.768 215.759C237.28 215.759 237.727 215.723 238.111 215.652C238.494 215.581 238.793 215.524 239.006 215.482L240.156 220.744C239.787 220.886 239.261 221.028 238.58 221.17C237.898 221.327 237.045 221.412 236.023 221.426C234.347 221.455 232.784 221.156 231.335 220.531C229.886 219.906 228.714 218.94 227.82 217.634C226.925 216.327 226.477 214.686 226.477 212.712V180.432ZM245.407 221V188.273H251.565V193.472H251.905C252.502 191.71 253.553 190.325 255.059 189.317C256.579 188.294 258.298 187.783 260.215 187.783C260.613 187.783 261.082 187.797 261.621 187.825C262.175 187.854 262.609 187.889 262.921 187.932V194.026C262.665 193.955 262.211 193.876 261.557 193.791C260.904 193.692 260.251 193.642 259.597 193.642C258.092 193.642 256.749 193.962 255.57 194.601C254.405 195.226 253.482 196.099 252.8 197.222C252.119 198.33 251.778 199.594 251.778 201.014V221H245.407ZM279.848 221.661C276.78 221.661 274.102 220.957 271.815 219.551C269.528 218.145 267.753 216.178 266.488 213.649C265.224 211.121 264.592 208.166 264.592 204.786C264.592 201.391 265.224 198.422 266.488 195.879C267.753 193.337 269.528 191.362 271.815 189.956C274.102 188.55 276.78 187.847 279.848 187.847C282.916 187.847 285.594 188.55 287.881 189.956C290.167 191.362 291.943 193.337 293.207 195.879C294.471 198.422 295.104 201.391 295.104 204.786C295.104 208.166 294.471 211.121 293.207 213.649C291.943 216.178 290.167 218.145 287.881 219.551C285.594 220.957 282.916 221.661 279.848 221.661ZM279.869 216.312C281.858 216.312 283.506 215.787 284.812 214.736C286.119 213.685 287.085 212.286 287.71 210.538C288.349 208.791 288.669 206.866 288.669 204.764C288.669 202.676 288.349 200.759 287.71 199.011C287.085 197.25 286.119 195.837 284.812 194.771C283.506 193.706 281.858 193.173 279.869 193.173C277.866 193.173 276.204 193.706 274.883 194.771C273.577 195.837 272.604 197.25 271.964 199.011C271.339 200.759 271.027 202.676 271.027 204.764C271.027 206.866 271.339 208.791 271.964 210.538C272.604 212.286 273.577 213.685 274.883 214.736C276.204 215.787 277.866 216.312 279.869 216.312ZM327.899 188.273L316.031 221H309.213L297.323 188.273H304.163L312.451 213.457H312.792L321.059 188.273H327.899ZM332.686 221V188.273H338.843V193.472H339.184C339.781 191.71 340.832 190.325 342.338 189.317C343.858 188.294 345.576 187.783 347.494 187.783C347.892 187.783 348.361 187.797 348.9 187.825C349.454 187.854 349.887 187.889 350.2 187.932V194.026C349.944 193.955 349.49 193.876 348.836 193.791C348.183 193.692 347.53 193.642 346.876 193.642C345.37 193.642 344.028 193.962 342.849 194.601C341.684 195.226 340.761 196.099 340.079 197.222C339.397 198.33 339.057 199.594 339.057 201.014V221H332.686Z"
              fill="#ffffff"
            />
            )}
            {/* "LEAD INTELLIGENCE" subtext — hidden when collapsed */}
            {!sidebarCollapsed && (
            <path
              d="M232.233 245V234.818H233.466V243.906H238.199V245H232.233ZM241.228 245V234.818H247.373V235.912H242.461V239.352H247.055V240.446H242.461V243.906H247.452V245H241.228ZM251.133 245H249.84L253.579 234.818H254.852L258.59 245H257.298L254.255 236.429H254.175L251.133 245ZM251.61 241.023H256.82V242.116H251.61V241.023ZM264.438 245H261.296V234.818H264.577C265.565 234.818 266.41 235.022 267.113 235.43C267.815 235.834 268.354 236.416 268.729 237.175C269.103 237.93 269.29 238.835 269.29 239.889C269.29 240.95 269.101 241.863 268.724 242.629C268.346 243.391 267.796 243.978 267.073 244.388C266.351 244.796 265.472 245 264.438 245ZM262.529 243.906H264.359C265.2 243.906 265.898 243.744 266.452 243.419C267.005 243.094 267.418 242.632 267.69 242.032C267.961 241.432 268.097 240.718 268.097 239.889C268.097 239.067 267.963 238.36 267.695 237.766C267.426 237.17 267.025 236.712 266.491 236.394C265.958 236.073 265.293 235.912 264.498 235.912H262.529V243.906ZM278.769 234.818V245H277.536V234.818H278.769ZM290.435 234.818V245H289.242L283.694 237.006H283.594V245H282.361V234.818H283.554L289.123 242.832H289.222V234.818H290.435ZM293.465 235.912V234.818H301.102V235.912H297.9V245H296.667V235.912H293.465ZM304.125 245V234.818H310.269V235.912H305.358V239.352H309.951V240.446H305.358V243.906H310.349V245H304.125ZM313.612 245V234.818H314.845V243.906H319.578V245H313.612ZM322.607 245V234.818H323.84V243.906H328.573V245H322.607ZM332.835 234.818V245H331.602V234.818H332.835ZM343.387 238C343.278 237.665 343.134 237.365 342.955 237.1C342.779 236.832 342.568 236.603 342.323 236.414C342.081 236.225 341.806 236.081 341.498 235.982C341.19 235.882 340.852 235.832 340.484 235.832C339.88 235.832 339.332 235.988 338.838 236.3C338.344 236.611 337.951 237.07 337.66 237.677C337.368 238.283 337.222 239.027 337.222 239.909C337.222 240.791 337.37 241.535 337.665 242.141C337.96 242.748 338.359 242.748 338.863 243.518C339.367 243.830 339.933 243.986 340.563 243.986C341.147 243.986 341.660 243.862 342.104 243.613C342.552 243.006 342.900 243.006 343.148 242.549C343.400 242.088 343.526 241.546 343.526 240.923L343.904 241.003H340.842V239.909H344.719V241.003C344.719 241.841 344.541 242.571 344.183 243.190C343.828 243.810 343.337 244.291 342.711 244.632C342.088 244.970 341.372 245.139 340.563 245.139C339.662 245.139 338.870 244.927 338.187 244.503C337.507 244.079 336.977 243.475 336.596 242.693C336.218 241.911 336.029 240.983 336.029 239.909C336.029 239.104 336.137 238.379 336.352 237.737C336.571 237.090 336.879 236.540 337.277 236.086C337.675 235.632 338.145 235.284 338.689 235.042C339.232 234.800 339.831 234.679 340.484 234.679C341.021 234.679 341.521 234.760 341.985 234.923C342.452 235.082 342.868 235.309 343.233 235.604C343.601 235.895 343.907 236.245 344.153 236.653C344.398 237.057 344.567 237.506 344.660 238.000H343.387ZM347.951 245.000V234.818H354.096V235.912H349.184V239.352H353.778V240.446H349.184V243.906H354.176V245.000H347.951ZM365.512 234.818V245.000H364.319L358.771 237.006H358.671V245.000H357.438V234.818H358.632L364.200 242.832H364.299V234.818H365.512ZM377.293 238.000H376.060C375.987 237.645 375.859 237.334 375.677 237.065C375.498 236.797 375.279 236.571 375.021 236.389C374.765 236.204 374.482 236.064 374.170 235.972C373.859 235.879 373.534 235.832 373.196 235.832C372.579 235.832 372.021 235.988 371.521 236.300C371.023 236.611 370.627 237.070 370.332 237.677C370.041 238.283 369.895 239.027 369.895 239.909C369.895 240.791 370.041 241.535 370.332 242.141C370.627 242.748 371.521 243.207 371.521 243.518C372.021 243.830 372.579 243.986 373.196 243.986C373.534 243.986 373.859 243.939 374.170 243.847C374.482 243.754 374.765 243.616 375.021 243.434C375.279 243.248 375.498 243.021 375.677 242.753C375.859 242.481 375.987 242.170 376.060 241.818H377.293C377.200 242.339 377.031 242.804 376.785 243.215C376.540 243.626 376.235 243.976 375.871 244.264C375.506 244.549 375.097 244.766 374.643 244.915C374.192 245.065 373.710 245.139 373.196 245.139C372.328 245.139 371.555 244.927 370.879 244.503C370.203 244.079 369.671 243.475 369.283 242.693C368.896 241.911 368.702 240.983 368.702 239.909C368.702 238.835 368.896 237.907 369.283 237.125C369.671 236.343 370.203 235.740 370.879 235.315C371.555 234.891 372.328 234.679 373.196 234.679C373.710 234.679 374.192 234.754 374.643 234.903C375.097 235.052 375.506 235.271 375.871 235.559C376.235 235.844 376.540 236.192 376.785 236.603C377.031 237.011 377.200 237.476 377.293 238.000ZM380.405 245.000V234.818H386.550V235.912H381.638V239.352H386.232V240.446H381.638V243.906H386.629V245.000H380.405Z"
              fill="var(--accent-cyan)"
            />
            )}
          </svg>
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
              <>{sidebarCollapsed ? '⚡' : '⚡ RUN SCRAPERS'}</>
            )}
          </button>

          <button
            id="btn-refresh"
            className="cyber-btn"
            onClick={fetchData}
            title={sidebarCollapsed ? 'Refresh Data' : undefined}
            style={{ width: '100%', fontSize: '0.7rem', padding: '8px' }}
          >
            {sidebarCollapsed ? '🔄' : '🔄 REFRESH DATA'}
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
              <span style={{ color: '#fff' }}>{systemStatus?.lead_count ?? '—'}</span><br />
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

      {/* ── Main Viewport ── */}
      <div className="cyber-main-viewport">

        {/* Loading state */}
        {loading && (
          <div className="cyber-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', borderColor: 'rgba(0,240,255,0.2)' }}>
            <div className="glow-indicator" />
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.78rem', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
              TROVR.AI. CONNECTING TO BACKEND...
            </span>
          </div>
        )}

        {/* Pipeline running banner */}
        {pipelineRunning && (
          <div className="cyber-card" style={{ background: 'rgba(0, 240, 255, 0.04)', borderColor: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="glow-indicator" />
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.78rem', color: '#fff', letterSpacing: '1px' }}>
              TROVR.AI PIPELINE ACTIVE. SCRAPING X AND GITHUB CONTRIBUTORS. THE FEED UPDATES LIVE.
            </span>
          </div>
        )}

        {/* Outreach confirmation banner */}
        {messagePrompt && (
          <div className="cyber-card card-corner-decor" style={{ borderColor: 'var(--accent-purple)', background: 'rgba(157, 78, 221, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.78rem', color: 'var(--accent-purple)', fontWeight: 'bold', marginBottom: '8px' }}>
                  🚀 DISPATCH SUCCESSFUL: {messagePrompt.stage.toUpperCase().replace(/_/g, ' ')}
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

        {/* Stats Panel — visible on dashboard + analytics */}
        {stats && (activeTab === 'dashboard' || activeTab === 'analytics') && (
          <StatsPanel stats={stats} pipelineStats={pipelineStats} />
        )}

        {/* ── Tab Content ── */}
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

            {showRightPanel && (
              <ScoreCard
                lead={selectedLead}
                onClose={() => setSelectedLead(null)}
                logs={logs}
                onTriggerOutreach={handleTriggerOutreach}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
