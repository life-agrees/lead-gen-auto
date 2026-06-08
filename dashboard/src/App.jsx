import React, { useState, useEffect, useCallback } from 'react';
import StatsPanel from './components/StatsPanel';
import LeadTable from './components/LeadTable';
import ScoreCard from './components/ScoreCard';
import OutreachLog from './components/OutreachLog';
import AnalyticsTab from './components/AnalyticsTab';

// Relative path — Vite proxy forwards /api/* to FastAPI on :8000 (no CORS)
const API_BASE = '/api';

const NAV_TABS = [
  { id: 'dashboard', icon: '📊', label: 'PIPELINE SUMMARY' },
  { id: 'telemetry', icon: '🕵️', label: 'LEAD TELEMETRY' },
  { id: 'analytics', icon: '📈', label: 'ANALYTICS' },
  { id: 'outreach', icon: '✉️', label: 'OUTREACH DISPATCH' },
];

export default function App() {
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

  const fetchData = useCallback(async () => {
    try {
      const [leadsRes, logsRes, statsRes, pipelineStatsRes, pipelineReportRes] = await Promise.all([
        fetch(`${API_BASE}/leads/`),
        fetch(`${API_BASE}/outreach/logs`),
        fetch(`${API_BASE}/reports/summary`),
        fetch(`${API_BASE}/leads/stats`),
        fetch(`${API_BASE}/reports/pipeline-report`),
      ]);

      const leadsData      = await leadsRes.json();
      const logsData       = await logsRes.json();
      const statsData      = await statsRes.json();
      const pStatsData     = await pipelineStatsRes.json();
      const pReportData    = await pipelineReportRes.json();

      setLeads(Array.isArray(leadsData) ? leadsData : []);
      setLogs(Array.isArray(logsData) ? logsData : []);
      setStats(statsData);
      setPipelineStats(pStatsData);
      setPipelineReport(pReportData);
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

  return (
    <div className="cyber-hud-container">

      {/* ── Sidebar ── */}
      <div className="cyber-sidebar">
        <div className="cyber-logo">
          TROVR<span>.AI</span>
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
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom panel */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
            SYSTEM ORCHESTRATION
          </div>

          <button
            id="btn-run-scrapers"
            className="cyber-btn cyber-btn-purple"
            onClick={handleTriggerPipeline}
            disabled={pipelineRunning}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
          >
            {pipelineRunning ? (
              <>
                <div className="glow-indicator" style={{ background: '#fff', boxShadow: '0 0 8px #fff' }} />
                SCANNING...
              </>
            ) : (
              '⚡ RUN SCRAPERS'
            )}
          </button>

          <button
            id="btn-refresh"
            className="cyber-btn"
            onClick={fetchData}
            style={{ width: '100%', fontSize: '0.7rem', padding: '8px' }}
          >
            🔄 REFRESH DATA
          </button>

          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', lineHeight: '1.6' }}>
            DATABASE: <span style={{ color: 'var(--accent-cyan)' }}>LOCAL_SQLITE</span><br />
            STATUS: <span style={{ color: '#34d399' }}>SYS_ONLINE</span><br />
            {lastRefresh && (
              <>
                SYNCED: <span style={{ color: '#fff' }}>{lastRefresh.toLocaleTimeString()}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Viewport ── */}
      <div className="cyber-main-viewport">

        {/* Loading state */}
        {loading && (
          <div className="cyber-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', borderColor: 'rgba(0,240,255,0.2)' }}>
            <div className="glow-indicator" />
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.78rem', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
              TROVR.AI — CONNECTING TO INTELLIGENCE BACKEND...
            </span>
          </div>
        )}

        {/* Pipeline running banner */}
        {pipelineRunning && (
          <div className="cyber-card" style={{ background: 'rgba(0, 240, 255, 0.04)', borderColor: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="glow-indicator" />
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.78rem', color: '#fff', letterSpacing: '1px' }}>
              TROVR.AI PIPELINE ENGAGED — SCRAPING X &amp; GITHUB CONTRIBUTORS... FEED UPDATES LIVE.
            </span>
          </div>
        )}

        {/* Outreach confirmation banner */}
        {messagePrompt && (
          <div className="cyber-card card-corner-decor" style={{ borderColor: 'var(--accent-purple)', background: 'rgba(157, 78, 221, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.78rem', color: 'var(--accent-purple)', fontWeight: 'bold', marginBottom: '8px' }}>
                  🚀 DISPATCH SUCCESSFUL — {messagePrompt.stage.toUpperCase().replace(/_/g, ' ')}
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: showRightPanel ? '1.7fr 1fr' : '1fr',
            gap: '20px',
            flex: '1',
          }}>
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

            {/* Right panel — Score card */}
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
