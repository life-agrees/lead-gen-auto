import React, { useState, useEffect } from 'react';
import StatsPanel from './components/StatsPanel';
import LeadTable from './components/LeadTable';
import ScoreCard from './components/ScoreCard';
import OutreachLog from './components/OutreachLog';

const API_BASE = 'http://localhost:8000/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [leads, setLeads] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [messagePrompt, setMessagePrompt] = useState(null);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const leadsRes = await fetch(`${API_BASE}/leads/`);
      const leadsData = await leadsRes.json();
      setLeads(leadsData);

      const logsRes = await fetch(`${API_BASE}/outreach/logs`);
      const logsData = await logsRes.json();
      setLogs(logsData);

      const statsRes = await fetch(`${API_BASE}/reports/summary`);
      const statsData = await statsRes.json();
      setStats(statsData);
      
      // Auto select first high lead if none selected
      if (leadsData.length > 0 && !selectedLead) {
        setSelectedLead(leadsData[0]);
      }
    } catch (err) {
      console.error("Failed to connect to FastAPI backend:", err);
    }
  };

  const handleTriggerPipeline = async () => {
    setPipelineRunning(true);
    try {
      const res = await fetch(`${API_BASE}/leads/trigger-pipeline?limit=4`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'running') {
        // Poll for completion every 3 seconds for 12 seconds total (simulate fast local test)
        let pollCount = 0;
        const interval = setInterval(async () => {
          await fetchData();
          pollCount++;
          if (pollCount >= 4) {
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
      const updatedLead = await res.json();
      
      // Update local state
      setLeads(leads.map(l => l.id === leadId ? updatedLead : l));
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(updatedLead);
      }
      
      // Re-fetch stats
      const statsRes = await fetch(`${API_BASE}/reports/summary`);
      const statsData = await statsRes.json();
      setStats(statsData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerOutreach = async (lead) => {
    // Stage is determined automatically by sequence or Day 1 Pitch default
    let stage = 'day_1_pitch';
    if (lead.outreach_status === 'day_1_pitch') stage = 'day_3_followup';
    else if (lead.outreach_status === 'day_3_followup') stage = 'day_7_breakup';

    try {
      // Trigger LLM prompt & log event
      const res = await fetch(`${API_BASE}/outreach/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id, stage: stage })
      });
      const logEntry = await res.json();

      // Show confirmation dialog prompt
      setMessagePrompt({
        leadName: lead.name,
        message: logEntry.message_body,
        stage: stage
      });

      // Reload
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateStatus = async (logId, leadId, newStatus) => {
    try {
      await fetch(`${API_BASE}/outreach/logs/${logId}/status?lead_id=${leadId}&new_status=${newStatus}`, { method: 'POST' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="cyber-hud-container">
      {/* Cyber Sidebar */}
      <div className="cyber-sidebar">
        <div className="cyber-logo">
          🤖 LEAD_GEN<span>.AI</span>
        </div>

        {/* Navigation list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            className="cyber-btn"
            onClick={() => setActiveTab('dashboard')}
            style={{ 
              width: '100%', 
              textAlign: 'left',
              background: activeTab === 'dashboard' ? 'var(--accent-cyan)' : 'none',
              color: activeTab === 'dashboard' ? 'var(--bg-dark)' : '#fff',
              border: activeTab === 'dashboard' ? '1px solid var(--accent-cyan)' : '1px solid transparent'
            }}
          >
            📊 PIPELINE SUMMARY
          </button>
          <button 
            className="cyber-btn"
            onClick={() => setActiveTab('telemetry')}
            style={{ 
              width: '100%', 
              textAlign: 'left',
              background: activeTab === 'telemetry' ? 'var(--accent-cyan)' : 'none',
              color: activeTab === 'telemetry' ? 'var(--bg-dark)' : '#fff',
              border: activeTab === 'telemetry' ? '1px solid var(--accent-cyan)' : '1px solid transparent'
            }}
          >
            🕵️‍♂️ LEAD TELEMETRY
          </button>
          <button 
            className="cyber-btn"
            onClick={() => setActiveTab('outreach')}
            style={{ 
              width: '100%', 
              textAlign: 'left',
              background: activeTab === 'outreach' ? 'var(--accent-cyan)' : 'none',
              color: activeTab === 'outreach' ? 'var(--bg-dark)' : '#fff',
              border: activeTab === 'outreach' ? '1px solid var(--accent-cyan)' : '1px solid transparent'
            }}
          >
            ✉️ OUTREACH DISPATCH
          </button>
        </div>

        {/* Global Operations Panel */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-hud)', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
            SYSTEM ORCHESTRATION
          </div>
          
          <button 
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

          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
            DATABASE: <span style={{ color: 'var(--accent-cyan)' }}>LOCAL_SQLITE</span><br />
            STATUS: <span style={{ color: '#34d399' }}>SYS_ONLINE</span>
          </div>
        </div>
      </div>

      {/* Main viewport */}
      <div className="cyber-main-viewport">
        {/* Pipeline running alert banner */}
        {pipelineRunning && (
          <div className="cyber-card" style={{ background: 'rgba(0, 240, 255, 0.05)', borderColor: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="glow-indicator" />
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.8rem', color: '#fff', letterSpacing: '1px' }}>
              PIPELINE ENGAGED: SCRAPING X & GITHUB CONTRIBUTORS... FEED WILL UPDATE IN REAL-TIME.
            </span>
          </div>
        )}

        {/* Outreah confirmation banner */}
        {messagePrompt && (
          <div className="cyber-card card-corner-decor" style={{ borderColor: 'var(--accent-purple)', background: 'rgba(157, 78, 221, 0.04)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.8rem', color: 'var(--accent-purple)', fontWeight: 'bold' }}>
                🚀 AUTOMATED DISPATCH SUCCESSFUL ({messagePrompt.stage.toUpperCase()})
              </span>
              <button 
                onClick={() => setMessagePrompt(null)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
              >
                &times;
              </button>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
              "Sent to {messagePrompt.leadName}: {messagePrompt.message}"
            </div>
          </div>
        )}

        {/* Dashboard statistics */}
        {stats && <StatsPanel stats={stats} />}

        {/* Main interactive segment based on tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'outreach' ? '1fr' : '1.8fr 1fr', gap: '20px', flex: '1' }}>
          
          {/* Left panel options */}
          {activeTab === 'dashboard' && (
            <LeadTable 
              leads={leads}
              onSelectLead={setSelectedLead}
              onRescoreLead={handleRescoreLead}
              onTriggerOutreach={handleTriggerOutreach}
            />
          )}

          {activeTab === 'telemetry' && (
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

          {/* Right Panel diagnostics (Only for dashboard & telemetry tabs) */}
          {activeTab !== 'outreach' && (
            <ScoreCard 
              lead={selectedLead}
              onClose={() => setSelectedLead(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
