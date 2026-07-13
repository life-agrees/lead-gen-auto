import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.DEV ? '/api' : 'https://p01--lead-gen--yg8hh58rzsgq.code.run/api';

const DEFAULT_SETTINGS = {
  persona_instructions: '',
  hot_threshold: 70,
  warm_threshold: 40,
  keywords: [],
  digest_enabled: false,
  digest_email: '',
  trial_passcode: 'free10',
  paid_passcode: 'paidleads',
};

const SectionTitle = ({ children }) => (
  <h3 style={{
    fontFamily: 'var(--font-hud)',
    fontSize: '0.78rem',
    letterSpacing: '1.5px',
    color: 'var(--text-secondary)',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  }}>
    <span style={{ display: 'inline-block', width: '16px', height: '2px', background: 'var(--accent-cyan)', boxShadow: '0 0 6px var(--accent-cyan)' }} />
    {children}
  </h3>
);

const cardStyle = {
  background: 'rgba(5, 7, 15, 0.55)',
  border: '1px solid var(--panel-border)',
  borderRadius: '12px',
  padding: '20px 22px',
};

const inputStyle = {
  background: 'rgba(5, 7, 15, 0.7)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '7px',
  padding: '9px 12px',
  color: '#fff',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.8rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

export default function SettingsPanel() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [keywordInput, setKeywordInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [digestPreview, setDigestPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/campaign`);
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings/campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        showToast('success', 'Settings saved');
      } else {
        showToast('error', 'Save failed. Check backend logs.');
      }
    } catch {
      showToast('error', 'Could not reach backend');
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    const kw = keywordInput.trim().toLowerCase();
    if (kw && !settings.keywords.includes(kw)) {
      setSettings(s => ({ ...s, keywords: [...s.keywords, kw] }));
    }
    setKeywordInput('');
  };

  const removeKeyword = (kw) => {
    setSettings(s => ({ ...s, keywords: s.keywords.filter(k => k !== kw) }));
  };

  const fetchDigestPreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch(`${API_BASE}/digest/preview`);
      if (res.ok) setDigestPreview(await res.json());
      else showToast('error', 'Could not load preview');
    } catch {
      showToast('error', 'Could not reach backend');
    } finally {
      setPreviewLoading(false);
    }
  };

  const sendTestDigest = async () => {
    if (!settings.digest_email.trim()) {
      showToast('error', 'Enter a recipient email first');
      return;
    }
    setSendingDigest(true);
    try {
      const res = await fetch(`${API_BASE}/digest/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_email: settings.digest_email }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', `Digest sent to ${settings.digest_email}`);
      } else {
        showToast('error', data.detail || 'Send failed');
      }
    } catch {
      showToast('error', 'Could not reach backend');
    } finally {
      setSendingDigest(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
        LOADING CONFIGURATION...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '860px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          padding: '10px 16px', borderRadius: '8px',
          fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
          background: toast.type === 'success' ? 'rgba(52,211,153,0.1)' : 'rgba(251,113,133,0.1)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(52,211,153,0.3)' : 'rgba(251,113,133,0.3)'}`,
          color: toast.type === 'success' ? '#34d399' : '#fb7185',
        }}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}

      {/* ── Section 1: Campaign Persona ── */}
      <div style={cardStyle}>
        <SectionTitle>CAMPAIGN PERSONA</SectionTitle>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '12px', lineHeight: 1.6 }}>
          This persona is injected into every AI message as a system prompt. Keep it concise, direct, and human.
        </p>
        <textarea
          value={settings.persona_instructions}
          onChange={e => setSettings(s => ({ ...s, persona_instructions: e.target.value }))}
          rows={5}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          placeholder="You are a founder reaching out to a potential collaborator..."
        />
      </div>

      {/* ── Section 2: Score Thresholds ── */}
      <div style={cardStyle}>
        <SectionTitle>SCORE THRESHOLDS</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {[
            { label: 'HOT THRESHOLD', key: 'hot_threshold', color: 'var(--accent-cyan)' },
            { label: 'WARM THRESHOLD', key: 'warm_threshold', color: '#b388ff' },
          ].map(({ label, key, color }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-hud)', fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                <span>{label}</span>
                <span style={{ color, fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{settings[key]}</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={settings[key]}
                onChange={e => setSettings(s => ({ ...s, [key]: Number(e.target.value) }))}
                style={{ accentColor: color, width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)' }}>
                <span>0</span><span>50</span><span>100</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 3: Scraper Keywords ── */}
      <div style={cardStyle}>
        <SectionTitle>SCRAPER KEYWORDS</SectionTitle>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '12px', lineHeight: 1.6 }}>
          These terms guide the Twitter and GitHub scrapers when searching for new leads.
        </p>

        {/* Tag chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', minHeight: '34px' }}>
          {settings.keywords.map(kw => (
            <div
              key={kw}
              style={{
                background: 'rgba(0,240,255,0.07)', border: '1px solid rgba(0,240,255,0.25)',
                borderRadius: '6px', padding: '4px 10px',
                display: 'flex', alignItems: 'center', gap: '6px',
                fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--accent-cyan)',
              }}
            >
              {kw}
              <button
                onClick={() => removeKeyword(kw)}
                style={{ background: 'none', border: 'none', color: 'rgba(0,240,255,0.5)', cursor: 'pointer', padding: '0', fontSize: '0.85rem', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          ))}
          {settings.keywords.length === 0 && (
            <span style={{ color: 'rgba(255,255,255,0.18)', fontFamily: 'var(--font-mono)', fontSize: '0.73rem' }}>No keywords yet</span>
          )}
        </div>

        {/* Add keyword input */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Add a keyword..."
            value={keywordInput}
            onChange={e => setKeywordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKeyword()}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={addKeyword}
            style={{
              background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.25)',
              borderRadius: '7px', color: 'var(--accent-cyan)',
              fontFamily: 'var(--font-hud)', fontSize: '0.68rem', letterSpacing: '0.8px',
              padding: '9px 16px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            + ADD
          </button>
        </div>
      </div>

      {/* ── Section 3b: Client Distribution ── */}
      <div style={cardStyle}>
        <SectionTitle>CLIENT DISTRIBUTION & ACCESS CODES</SectionTitle>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '16px', lineHeight: 1.7 }}>
          Configure passcodes to distribute access to your dashboard. Clients will enter these codes on the landing page to load their view.
        </p>

        {/* Trial Passcode */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.7rem', color: 'var(--accent-cyan)', marginBottom: '8px', letterSpacing: '0.5px' }}>
            FREE TRIAL PASSCODE (LIMITS ACCESS TO 10 LEADS + SHOWS UPGRADE CTA)
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Trial passcode..."
              value={settings.trial_passcode || ''}
              onChange={e => setSettings(s => ({ ...s, trial_passcode: e.target.value }))}
              style={{ ...inputStyle, flex: 1, fontWeight: 700, letterSpacing: '2px' }}
            />
            <button
              onClick={() => {
                const code = Math.random().toString(36).slice(2, 10);
                setSettings(s => ({ ...s, trial_passcode: code }));
              }}
              style={{
                background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.2)',
                borderRadius: '7px', color: 'var(--accent-cyan)',
                fontFamily: 'var(--font-hud)', fontSize: '0.67rem', letterSpacing: '0.8px',
                padding: '9px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              ↺ GENERATE
            </button>
          </div>
        </div>

        {/* Paid Passcode */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.7rem', color: '#b388ff', marginBottom: '8px', letterSpacing: '0.5px' }}>
            PAID CLIENT PASSCODE (GRANTS FULL CLIENT VIEW WITH NO LEADS LIMIT & NO UPGRADE BANNER)
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Paid passcode..."
              value={settings.paid_passcode || ''}
              onChange={e => setSettings(s => ({ ...s, paid_passcode: e.target.value }))}
              style={{ ...inputStyle, flex: 1, fontWeight: 700, letterSpacing: '2px' }}
            />
            <button
              onClick={() => {
                const code = Math.random().toString(36).slice(2, 10);
                setSettings(s => ({ ...s, paid_passcode: code }));
              }}
              style={{
                background: 'rgba(179,136,255,0.06)', border: '1px solid rgba(179,136,255,0.2)',
                borderRadius: '7px', color: '#b388ff',
                fontFamily: 'var(--font-hud)', fontSize: '0.67rem', letterSpacing: '0.8px',
                padding: '9px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              ↺ GENERATE
            </button>
          </div>
        </div>

        <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)', marginTop: '8px' }}>
          Admin master code (set via ADMIN_MASTER_CODE env var) always grants access to your founder HUD panel.
        </p>
      </div>
      <div style={cardStyle}>
        <SectionTitle>DAILY DIGEST</SectionTitle>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '16px', lineHeight: 1.6 }}>
          Sends a summary email every day at 08:00 UTC covering new leads, messages sent, and replies received.
          Requires RESEND_API_KEY in your backend .env.
        </p>

        {/* Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button
            onClick={() => setSettings(s => ({ ...s, digest_enabled: !s.digest_enabled }))}
            style={{
              width: '44px', height: '24px', borderRadius: '12px', border: 'none',
              background: settings.digest_enabled ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
              cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <div style={{
              width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
              position: 'absolute', top: '3px',
              left: settings.digest_enabled ? '23px' : '3px',
              transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
            }} />
          </button>
          <span style={{ fontFamily: 'var(--font-hud)', fontSize: '0.72rem', color: settings.digest_enabled ? 'var(--accent-cyan)' : 'var(--text-secondary)', letterSpacing: '0.5px' }}>
            {settings.digest_enabled ? 'ENABLED' : 'DISABLED'}
          </span>
        </div>

        {/* Recipient email */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="email"
            placeholder="Recipient email..."
            value={settings.digest_email}
            onChange={e => setSettings(s => ({ ...s, digest_email: e.target.value }))}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={sendTestDigest}
            disabled={sendingDigest || !settings.digest_email.trim()}
            style={{
              background: 'rgba(157,78,221,0.1)', border: '1px solid rgba(157,78,221,0.3)',
              borderRadius: '7px', color: '#b388ff',
              fontFamily: 'var(--font-hud)', fontSize: '0.68rem', letterSpacing: '0.8px',
              padding: '9px 14px', cursor: sendingDigest ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap', opacity: sendingDigest || !settings.digest_email.trim() ? 0.5 : 1,
            }}
          >
            {sendingDigest ? 'SENDING...' : 'SEND TEST'}
          </button>
        </div>

        {/* Preview */}
        <button
          onClick={fetchDigestPreview}
          disabled={previewLoading}
          style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '7px', color: 'var(--text-secondary)',
            fontFamily: 'var(--font-hud)', fontSize: '0.67rem', letterSpacing: '0.8px',
            padding: '7px 14px', cursor: 'pointer', marginBottom: digestPreview ? '16px' : '0',
          }}
        >
          {previewLoading ? 'LOADING...' : 'PREVIEW DIGEST'}
        </button>

        {digestPreview && (
          <div style={{
            background: 'rgba(5,7,15,0.6)', border: '1px solid rgba(0,240,255,0.1)',
            borderRadius: '8px', padding: '14px 16px',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px',
          }}>
            {[
              { label: 'NEW LEADS', value: digestPreview.new_leads_total, color: 'var(--accent-cyan)' },
              { label: 'HOT (≥70)', value: digestPreview.new_hot_leads, color: 'var(--accent-cyan)' },
              { label: 'MSGS SENT', value: digestPreview.messages_sent, color: '#b388ff' },
              { label: 'REPLIES', value: digestPreview.replies_received, color: '#34d399' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 'bold', color }}>{value}</div>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '3px', letterSpacing: '0.5px' }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Save button ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          id="btn-save-settings"
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? 'rgba(0,240,255,0.06)' : 'linear-gradient(135deg, rgba(0,240,255,0.2), rgba(0,240,255,0.08))',
            border: '1px solid rgba(0,240,255,0.35)',
            borderRadius: '8px', color: saving ? 'var(--text-secondary)' : 'var(--accent-cyan)',
            fontFamily: 'var(--font-hud)', fontSize: '0.72rem', letterSpacing: '1px',
            padding: '11px 28px', cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: saving ? 'none' : '0 0 14px rgba(0,240,255,0.15)',
            transition: 'all 0.2s',
          }}
        >
          {saving ? 'SAVING...' : 'SAVE CONFIGURATION'}
        </button>
      </div>

    </div>
  );
}
