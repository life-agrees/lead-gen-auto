import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, Area, AreaChart
} from 'recharts';

const COLORS = {
  hot: '#00f0ff',
  warm: '#9d4edd',
  cold: '#475569',
  twitter: '#1da1f2',
  github: '#f0f6fc',
  onchain: '#00f0ff',
  discord: '#5865f2',
  unknown: '#64748b',
};

const STAGE_LABELS = {
  day_1_pitch: 'Day 1 Pitch',
  day_3_followup: 'Day 3 Follow-up',
  day_7_breakup: 'Day 7 Break-up',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(5, 7, 15, 0.95)',
        border: '1px solid rgba(0, 240, 255, 0.25)',
        borderRadius: '8px',
        padding: '10px 14px',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.78rem',
      }}>
        <div style={{ color: 'var(--accent-cyan)', marginBottom: '4px', fontWeight: 'bold' }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color || '#fff' }}>
            {p.name}: <strong>{p.value}{p.name?.toLowerCase().includes('rate') ? '%' : ''}</strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const SectionTitle = ({ children }) => (
  <h3 style={{
    fontFamily: 'var(--font-hud)',
    fontSize: '0.8rem',
    letterSpacing: '1.5px',
    color: 'var(--text-secondary)',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  }}>
    <span style={{ display: 'inline-block', width: '20px', height: '2px', background: 'var(--accent-cyan)', boxShadow: '0 0 6px var(--accent-cyan)' }} />
    {children}
  </h3>
);

export default function AnalyticsTab({ pipelineStats, pipelineReport }) {
  if (!pipelineStats || !pipelineReport) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
        LOADING ANALYTICS FEEDS...
      </div>
    );
  }

  // --- Tier pie data ---
  const tierData = [
    { name: 'HOT (≥70)', value: pipelineStats.tiers.hot, color: COLORS.hot },
    { name: 'WARM (40–69)', value: pipelineStats.tiers.warm, color: COLORS.warm },
    { name: 'COLD (<40)', value: pipelineStats.tiers.cold, color: COLORS.cold },
  ].filter(d => d.value > 0);

  // --- Source pie data ---
  const sourceData = Object.entries(pipelineStats.sources || {}).map(([key, val]) => ({
    name: key.toUpperCase(),
    value: val,
    color: COLORS[key] || COLORS.unknown,
  }));

  // --- Pipeline funnel bar data ---
  const funnelData = [
    { stage: 'Discovered', count: pipelineStats.pipeline.discovered },
    { stage: 'Scored', count: pipelineStats.pipeline.scored },
    { stage: 'Contacted', count: pipelineStats.pipeline.contacted },
    { stage: 'Replied', count: pipelineStats.pipeline.replied },
  ];

  // --- Stage performance ---
  const stagePerf = Object.entries(pipelineReport.stage_performance || {}).map(([key, val]) => ({
    stage: STAGE_LABELS[key] || key,
    Sent: val.sent,
    Opened: val.opened,
    Replied: val.replied,
    'Reply Rate %': val.reply_rate,
  }));

  // --- Daily activity line ---
  const dailyData = pipelineReport.daily_activity || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Row 1: Tier + Source pie charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Tier breakdown */}
        <div className="cyber-card card-corner-decor">
          <SectionTitle>LEAD TIER DISTRIBUTION</SectionTitle>
          {tierData.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '20px' }}>
              NO TIER DATA AVAILABLE
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={tierData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {tierData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Source distribution */}
        <div className="cyber-card card-corner-decor">
          <SectionTitle>LEAD SOURCE DISTRIBUTION</SectionTitle>
          {sourceData.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '20px' }}>
              NO SOURCE DATA AVAILABLE
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`src-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 2: Pipeline funnel bar + Daily activity line */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Funnel bar chart */}
        <div className="cyber-card card-corner-decor">
          <SectionTitle>PIPELINE STAGE FUNNEL</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnelData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="stage"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-hud)' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="url(#cyanGrad)" radius={[4, 4, 0, 0]}>
                <defs>
                  <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f0ff" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#00f0ff" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily activity area chart */}
        <div className="cyber-card card-corner-decor">
          <SectionTitle>7-DAY OUTREACH ACTIVITY</SectionTitle>
          {dailyData.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '40px 20px' }}>
              NO OUTREACH LOGS IN LAST 7 DAYS.<br />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>Trigger outreach from the Lead Telemetry tab to see activity here.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9d4edd" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9d4edd" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Messages Sent"
                  stroke="#9d4edd"
                  strokeWidth={2}
                  fill="url(#purpleGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 3: Stage performance grouped bar chart */}
      <div className="cyber-card card-corner-decor">
        <SectionTitle>STAGE PERFORMANCE — SENT / OPENED / REPLIED</SectionTitle>
        {stagePerf.every(s => s.Sent === 0) ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '30px' }}>
            NO STAGE DATA YET — TRIGGER OUTREACH TO POPULATE THIS CHART.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stagePerf} barGap={4} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="stage"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-hud)' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>{value}</span>
                )}
              />
              <Bar dataKey="Sent" fill="rgba(0, 240, 255, 0.5)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Opened" fill="rgba(157, 78, 221, 0.6)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Replied" fill="rgba(52, 211, 153, 0.7)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Row 4: Top Leads leaderboard */}
      <div className="cyber-card card-corner-decor">
        <SectionTitle>TOP 5 LEADS BY FIT SCORE</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(pipelineReport.top_leads || []).map((lead, idx) => (
            <div
              key={lead.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                background: 'rgba(5, 7, 15, 0.4)',
                border: '1px solid rgba(0, 240, 255, 0.07)',
                borderRadius: '8px',
                padding: '12px 16px',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.25)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.07)'}
            >
              {/* Rank badge */}
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: idx === 0 ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${idx === 0 ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
                color: idx === 0 ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: 'bold', flexShrink: 0,
              }}>
                #{idx + 1}
              </div>

              {/* Lead info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: '#fff', fontSize: '0.88rem' }}>{lead.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  @{lead.username} · <span className={`source-tag tag-${lead.source}`}>{lead.source}</span>
                </div>
              </div>

              {/* Status */}
              <span className={`status-pill status-${lead.outreach_status.replace('day_1_pitch', 'sent').replace('day_3_followup', 'sent').replace('day_7_breakup', 'sent')}`}>
                {lead.outreach_status.replace(/_/g, ' ')}
              </span>

              {/* Score */}
              <div style={{
                fontFamily: 'var(--font-mono)', fontWeight: '800',
                fontSize: '1.1rem',
                color: lead.score >= 70 ? 'var(--accent-cyan)' : lead.score >= 40 ? '#b388ff' : 'var(--text-secondary)',
                textShadow: lead.score >= 70 ? 'var(--text-glow)' : 'none',
                minWidth: '50px', textAlign: 'right',
              }}>
                {lead.score}%
              </div>
            </div>
          ))}
          {(pipelineReport.top_leads || []).length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', padding: '20px', fontSize: '0.8rem' }}>
              NO LEADS IN DATABASE
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
