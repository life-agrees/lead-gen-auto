import React, { useEffect, useState } from 'react';
import TrovrLogo from './TrovrLogo';

const BOOT_LINES = [
  'INITIALIZING TROVR ENGINE v1.0.0...',
  'LOADING SIGNAL INTELLIGENCE MODULES...',
  'CONNECTING TO POLYGON · BASE · ARBITRUM · BSC STREAMS...',
  'CALIBRATING 22-SIGNAL GRADIENT BOOST SCORER...',
  'PILOT: 129 LEADS FOUND · 8 HOT · 16 DMs DISPATCHED',
  'MOUNTING OUTREACH DISPATCH LAYER...',
  'ALL SYSTEMS NOMINAL. ENGAGING HUD',
];

export default function Preloader({ onComplete }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const total = BOOT_LINES.length;
    const step = 100 / total;

    const timer = setInterval(() => {
      setLineIndex(prev => {
        const next = prev + 1;
        setProgress(Math.min(next * step, 100));
        if (next >= total) {
          clearInterval(timer);
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(onComplete, 700);
          }, 600);
        }
        return next;
      });
    }, 380);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className={`preloader-overlay${fadeOut ? ' fade-out' : ''}`}>
      {/* Animated grid + scan line */}
      <div className="preloader-grid" />

      {/* Central content */}
      <div className="preloader-core">
        {/* Logo — identical to dashboard sidebar */}
        <div className="preloader-logo-wrap">
          <TrovrLogo width={260} filterId="pre-logo-glow" />
          <div className="preloader-pulse-ring" />
        </div>

        {/* Boot log */}
        <div className="preloader-log">
          {BOOT_LINES.slice(0, lineIndex).map((line, i) => (
            <div
              key={i}
              className={`preloader-log-line ${i === lineIndex - 1 ? 'active' : 'done'}`}
            >
              <span className="log-prefix">{'>'}</span>
              {line}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="preloader-progress-wrap">
          <div className="preloader-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="preloader-pct">{Math.round(progress)}%</div>
      </div>

      {/* Corner decorations */}
      <div className="pre-corner pre-tl" />
      <div className="pre-corner pre-tr" />
      <div className="pre-corner pre-bl" />
      <div className="pre-corner pre-br" />
    </div>
  );
}
