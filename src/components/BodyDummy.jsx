import React, { useState } from 'react';
import './BodyDummy.css';

// --- Color helpers ---
export const getSorenessColor = (wi) => {
  if (!wi) return null;
  if (wi <= 2) return 'rgba(34, 197, 94, 0.55)'; // Fine
  if (wi <= 4) return 'rgba(234, 179, 8, 0.65)'; // Mild
  if (wi <= 6) return 'rgba(249, 115, 22, 0.72)'; // Moderate
  if (wi <= 8) return 'rgba(239, 68, 68, 0.80)'; // Sore
  return 'rgba(185, 28, 28, 0.92)'; // Severe
};

export const getWeightedIntensity = (intensity, roundLogged, maxRounds) => {
  if (!intensity) return 0;
  if (!roundLogged || !maxRounds || maxRounds === 0) return intensity;
  const weighted = intensity * (1 + (roundLogged / maxRounds) * 0.5);
  return Math.min(10, weighted);
};

// Zone fill: healthy green when no soreness, heatmap color when active
const zoneFill = (zoneId, bodyMap, maxRounds) => {
  const entry = bodyMap[zoneId];
  if (!entry) return 'rgba(34, 197, 94, 0.3)';
  const wi = getWeightedIntensity(entry.intensity, entry.roundLogged, maxRounds);
  return getSorenessColor(wi) || 'rgba(34, 197, 94, 0.3)';
};

// --- Detailed Anatomical Zone Definitions ---
const FRONT_ZONES = [
  { id: 'head', label: 'Head', shape: 'ellipse', cx: 50, cy: 11, rx: 10, ry: 13 },
  { id: 'neck', label: 'Neck', shape: 'path', d: 'M 43,21 L 57,21 L 56,27 L 44,27 Z' },
  { id: 'l_shoulder', label: 'L Shoulder', shape: 'path', d: 'M 44,27 L 31,27 Q 21,29 19,38 L 26,48 L 31,44 L 32,35 Z' },
  { id: 'r_shoulder', label: 'R Shoulder', shape: 'path', d: 'M 56,27 L 69,27 Q 79,29 81,38 L 74,48 L 69,44 L 68,35 Z' },
  { id: 'l_chest', label: 'L Chest', shape: 'path', d: 'M 49.5,27 L 32,35 Q 31,46 38,47 Q 44,48 49.5,45 Z' },
  { id: 'r_chest', label: 'R Chest', shape: 'path', d: 'M 50.5,27 L 68,35 Q 69,46 62,47 Q 56,48 50.5,45 Z' },
  { id: 'l_arm', label: 'L Bicep', shape: 'path', d: 'M 19,38 Q 15,50 16,62 L 24,66 L 27,55 L 26,48 Z' },
  { id: 'r_arm', label: 'R Bicep', shape: 'path', d: 'M 81,38 Q 85,50 84,62 L 76,66 L 73,55 L 74,48 Z' },
  { id: 'l_forearm', label: 'L Forearm', shape: 'path', d: 'M 16,62 Q 10,75 12,90 L 16,110 L 22,110 L 22,90 L 24,66 Z' },
  { id: 'r_forearm', label: 'R Forearm', shape: 'path', d: 'M 84,62 Q 90,75 88,90 L 84,110 L 78,110 L 78,90 L 76,66 Z' },
  { id: 'abs_upper', label: 'Upper Abs', shape: 'path', d: 'M 38,47.5 L 62,47.5 L 59,62 L 41,62 Z' },
  { id: 'abs_lower', label: 'Lower Abs', shape: 'path', d: 'M 41,62.5 L 59,62.5 L 55,79 L 45,79 Z' },
  { id: 'l_oblique', label: 'L Oblique', shape: 'path', d: 'M 31,44 L 37.5,47.5 L 40.5,62 L 44.5,79 L 32,79 Q 28,60 31,44 Z' },
  { id: 'r_oblique', label: 'R Oblique', shape: 'path', d: 'M 69,44 L 62.5,47.5 L 59.5,62 L 55.5,79 L 68,79 Q 72,60 69,44 Z' },
  { id: 'l_hip', label: 'L Hip', shape: 'path', d: 'M 32,79.5 L 44.5,79.5 L 49.5,92 L 28,92 Z' },
  { id: 'r_hip', label: 'R Hip', shape: 'path', d: 'M 68,79.5 L 55.5,79.5 L 50.5,92 L 72,92 Z' },
  { id: 'l_quad', label: 'L Quad', shape: 'path', d: 'M 28,92 L 49.5,92 L 47,138 L 30,135 Q 24,115 28,92 Z' },
  { id: 'r_quad', label: 'R Quad', shape: 'path', d: 'M 72,92 L 50.5,92 L 53,138 L 70,135 Q 76,115 72,92 Z' },
  { id: 'l_shin', label: 'L Shin', shape: 'path', d: 'M 30,135.5 L 47,138.5 L 44,185 L 34,185 Q 26,160 30,135.5 Z' },
  { id: 'r_shin', label: 'R Shin', shape: 'path', d: 'M 70,135.5 L 53,138.5 L 56,185 L 66,185 Q 74,160 70,135.5 Z' },
  { id: 'l_foot', label: 'L Foot', shape: 'path', d: 'M 34,185.5 L 44,185.5 L 48,208 L 24,208 Z' },
  { id: 'r_foot', label: 'R Foot', shape: 'path', d: 'M 66,185.5 L 56,185.5 L 52,208 L 76,208 Z' },
];

const BACK_ZONES = [
  { id: 'head_back', label: 'Head', shape: 'ellipse', cx: 50, cy: 11, rx: 10, ry: 13 },
  { id: 'traps_upper', label: 'Upper Traps', shape: 'path', d: 'M 49.5,24 L 64,30 L 49.5,42 L 36,30 Z' },
  { id: 'upper_back', label: 'Middle Traps', shape: 'path', d: 'M 36,30.5 L 49.5,42.5 L 64,30.5 L 67,48 L 49.5,60 L 33,48 Z' },
  { id: 'l_lat', label: 'L Lat', shape: 'path', d: 'M 32.5,48.5 L 49,60 L 45,78 L 30,78 Z' },
  { id: 'r_lat', label: 'R Lat', shape: 'path', d: 'M 67.5,48.5 L 50,60 L 55,78 L 70,78 Z' },
  { id: 'l_erector', label: 'L Lower Back', shape: 'path', d: 'M 49.5,60.5 L 45.5,78 L 48,92 L 49.5,92 Z' },
  { id: 'r_erector', label: 'R Lower Back', shape: 'path', d: 'M 50.5,60.5 L 54.5,78 L 52,92 L 50.5,92 Z' },
  { id: 'l_delt_back', label: 'L Posterior Delt', shape: 'path', d: 'M 44,27 L 35.5,30 L 32.5,48 L 26,48 L 19,38 Q 21,29 31,27 Z' },
  { id: 'r_delt_back', label: 'R Posterior Delt', shape: 'path', d: 'M 56,27 L 64.5,30 L 67.5,48 L 74,48 L 81,38 Q 79,29 69,27 Z' },
  { id: 'l_tricep', label: 'L Tricep', shape: 'path', d: 'M 18.5,38 L 25.5,48.5 L 26.5,55 L 23.5,66 L 21.5,90 L 21.5,110 L 15.5,110 L 11.5,90 Q 9.5,75 15.5,62 Q 14.5,50 18.5,38 Z' },
  { id: 'r_tricep', label: 'R Tricep', shape: 'path', d: 'M 81.5,38 L 74.5,48.5 L 73.5,55 L 76.5,66 L 78.5,90 L 78.5,110 L 84.5,110 L 88.5,90 Q 90.5,75 84.5,62 Q 85.5,50 81.5,38 Z' },
  { id: 'l_glute', label: 'L Glute', shape: 'path', d: 'M 29.5,78.5 L 45.5,78.5 L 48.5,92 L 49.5,108 L 27,100 Z' },
  { id: 'r_glute', label: 'R Glute', shape: 'path', d: 'M 70.5,78.5 L 54.5,78.5 L 51.5,92 L 50.5,108 L 73,100 Z' },
  { id: 'l_hamstring', label: 'L Hamstring', shape: 'path', d: 'M 27.5,100.5 L 49,108.5 L 47,138 L 30,135 Q 24,115 27.5,100.5 Z' },
  { id: 'r_hamstring', label: 'R Hamstring', shape: 'path', d: 'M 72.5,100.5 L 51,108.5 L 53,138 L 70,135 Q 76,115 72.5,100.5 Z' },
  { id: 'l_calf', label: 'L Calf', shape: 'path', d: 'M 30,135.5 L 47,138.5 L 44,185 L 34,185 Q 26,160 30,135.5 Z' },
  { id: 'r_calf', label: 'R Calf', shape: 'path', d: 'M 70,135.5 L 53,138.5 L 56,185 L 66,185 Q 74,160 70,135.5 Z' },
  { id: 'l_heel', label: 'L Heel', shape: 'path', d: 'M 34,185.5 L 44,185.5 L 48,208 L 24,208 Z' },
  { id: 'r_heel', label: 'R Heel', shape: 'path', d: 'M 66,185.5 L 56,185.5 L 52,208 L 76,208 Z' },
];

const FRONT_SILHOUETTE = `
  M 50,0
  C 60,0 60,20 54,23
  L 69,27
  Q 79,29 81,38
  Q 85,50 84,62
  Q 90,75 88,90
  L 84,110 L 78,110 L 78,90 L 76,66 L 73,55 L 69,44
  Q 72,60 68,79.5
  L 72,92
  Q 76,115 70,135
  Q 74,160 66,185
  L 76,208 L 52,208 L 56,185 L 53,138 L 50.5,92 L 49.5,92 L 47,138 L 44,185 L 48,208 L 24,208
  L 34,185
  Q 26,160 30,135
  Q 24,115 28,92
  L 32,79.5
  Q 28,60 31,44
  L 27,55 L 24,66 L 22,90 L 22,110 L 16,110 L 12,90
  Q 10,75 16,62
  Q 15,50 19,38
  Q 21,29 31,27
  L 46,23
  C 40,20 40,0 50,0
  Z
`;

const ZONE_LABELS_MAP = {
  head: 'Head', neck: 'Neck',
  l_shoulder: 'L Shoulder', r_shoulder: 'R Shoulder',
  l_chest: 'L Chest', r_chest: 'R Chest',
  l_arm: 'L Bicep', r_arm: 'R Bicep',
  l_forearm: 'L Forearm', r_forearm: 'R Forearm',
  abs_upper: 'Upper Abs', abs_lower: 'Lower Abs',
  l_oblique: 'L Oblique', r_oblique: 'R Oblique',
  l_hip: 'L Hip', r_hip: 'R Hip',
  l_quad: 'L Quad', r_quad: 'R Quad',
  l_shin: 'L Shin', r_shin: 'R Shin',
  l_foot: 'L Foot', r_foot: 'R Foot',
  head_back: 'Head', traps_upper: 'Upper Traps', upper_back: 'Middle Traps',
  l_lat: 'L Lat', r_lat: 'R Lat',
  l_erector: 'L Lower Back', r_erector: 'R Lower Back',
  l_delt_back: 'L Post. Delt', r_delt_back: 'R Post. Delt',
  l_tricep: 'L Tricep', r_tricep: 'R Tricep',
  l_glute: 'L Glute', r_glute: 'R Glute',
  l_hamstring: 'L Hamstring', r_hamstring: 'R Hamstring',
  l_calf: 'L Calf', r_calf: 'R Calf',
  l_heel: 'L Heel', r_heel: 'R Heel',
};

function BodyPanel({ zones, bodyMap, onZoneClick, onOutlineClick, interactive, selectedZone, maxRounds, side, label, onHover }) {
  return (
    <div className="body-panel-col">
      <div className="body-panel-label">{label}</div>
      <svg viewBox="0 0 100 220" className={`body-panel ${interactive ? 'interactive' : ''}`}>
        <path d={FRONT_SILHOUETTE} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" onClick={onOutlineClick} />
        {zones.map(zone => {
          const isSelected = selectedZone === zone.id;
          const entry = bodyMap[zone.id];
          const fill = zoneFill(zone.id, bodyMap, maxRounds);
          const hasSoreness = !!entry;

          const commonProps = {
            key: zone.id,
            onClick: (e) => { e.stopPropagation(); onZoneClick(zone.id); },
            onMouseEnter: () => onHover(zone.id),
            onMouseLeave: () => onHover(null),
            className: `body-zone ${interactive ? 'clickable' : ''} ${isSelected ? 'selected' : ''}`,
            fill: fill,
            stroke: isSelected ? '#ffffff' : hasSoreness ? 'rgba(255,255,255,0.4)' : 'transparent',
            strokeWidth: isSelected ? '1.5' : hasSoreness ? '0.5' : '0'
          };

          return zone.shape === 'ellipse' ?
            <ellipse {...commonProps} cx={zone.cx} cy={zone.cy} rx={zone.rx} ry={zone.ry} /> :
            <path {...commonProps} d={zone.d} />;
        })}
        {/* Render custom tag circles */}
        {Object.entries(bodyMap)
          .filter(([k, v]) => k.startsWith('custom_') && v.side === side)
          .map(([k, v]) => {
            const isSelected = selectedZone === k;
            const fill = getSorenessColor(getWeightedIntensity(v.intensity, v.roundLogged, maxRounds));
            return (
              <circle
                key={k} cx={v.x} cy={v.y} r="3"
                className={`body-zone clickable ${isSelected ? 'selected' : ''}`}
                fill={fill || 'rgba(239, 68, 68, 0.6)'}
                stroke={isSelected ? '#fff' : 'rgba(255,255,255,0.3)'}
                strokeWidth={isSelected ? '1.5' : '1'}
                onClick={(e) => { e.stopPropagation(); onZoneClick(k); }}
                onMouseEnter={() => onHover(k)}
                onMouseLeave={() => onHover(null)}
              />
            );
          })}
      </svg>
    </div>
  );
}

export function BodyDummy({ bodyMap = {}, onChange, currentRound = 0, maxRounds = 12, readonly = false, compact = false, showLegend = false }) {
  const [selectedZone, setSelectedZone] = useState(null);
  const [hoveredZone, setHoveredZone] = useState(null);
  const [pendingIntensity, setPendingIntensity] = useState(1);

  const handleZoneClick = (zoneId) => {
    if (readonly) return;
    if (selectedZone === zoneId) {
      setSelectedZone(null);
    } else {
      const existing = bodyMap[zoneId];
      setPendingIntensity(existing?.intensity ?? 1);
      setSelectedZone(zoneId);
    }
  };

  const handleOutlineClick = (e) => {
    if (readonly || compact) return;
    const svg = e.currentTarget.closest('svg');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    const svgX = Math.round(svgP.x);
    const svgY = Math.round(svgP.y);
    const side = svgX < 50 ? 'left' : 'right';
    const customId = `custom_${Date.now()}`;
    const next = {
      ...bodyMap,
      [customId]: { x: svgX, y: svgY, label: 'Custom', intensity: 1, roundLogged: currentRound, side },
    };
    onChange(next);
    setSelectedZone(customId);
    setPendingIntensity(1);
  };

  const applyIntensity = (intensity) => {
    if (!selectedZone) return;
    setPendingIntensity(intensity);
    const existing = bodyMap[selectedZone];
    const next = { ...bodyMap };
    next[selectedZone] = {
      ...existing,
      intensity,
      roundLogged: existing?.roundLogged ?? currentRound,
      label: existing?.label || (ZONE_LABELS_MAP[selectedZone] || 'Custom')
    };
    onChange(next);
  };

  const clearZone = (zoneId) => {
    const next = { ...bodyMap };
    delete next[zoneId];
    onChange(next);
    if (selectedZone === zoneId) setSelectedZone(null);
  };

  const selectedLabel = selectedZone ? (ZONE_LABELS_MAP[selectedZone] || 'Custom Tag') : '';
  const hoveredLabel = hoveredZone ? (ZONE_LABELS_MAP[hoveredZone] || '') : '';

  return (
    <div className={`body-dummy-wrapper ${compact ? 'compact' : ''}`}>
      <div className="body-panels-row">
        <BodyPanel side="left" label="Front" zones={FRONT_ZONES} bodyMap={bodyMap} onZoneClick={handleZoneClick} onOutlineClick={handleOutlineClick} interactive={!readonly} selectedZone={selectedZone} maxRounds={maxRounds} onHover={setHoveredZone} />
        <BodyPanel side="right" label="Back" zones={BACK_ZONES} bodyMap={bodyMap} onZoneClick={handleZoneClick} onOutlineClick={handleOutlineClick} interactive={!readonly} selectedZone={selectedZone} maxRounds={maxRounds} onHover={setHoveredZone} />
      </div>

      {!readonly && !compact && (
        <div className="body-intensity-row">
          {selectedZone ? (
            <>
              <div className="body-intensity-info">
                <span className="body-intensity-label">{selectedLabel}</span>
                <span className="body-intensity-val" style={{ color: getSorenessColor(pendingIntensity) }}>
                  Intensity {pendingIntensity}/10
                </span>
              </div>
              <input
                type="range" min="1" max="10"
                value={pendingIntensity}
                onChange={e => applyIntensity(Number(e.target.value))}
                className="body-intensity-slider"
              />
            </>
          ) : (
            <div className="body-intensity-hint">
              {hoveredLabel ? (
                <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{hoveredLabel}</span>
              ) : (
                "Tap muscle zones to track specific soreness."
              )}
            </div>
          )}
        </div>
      )}

      {!readonly && !compact && Object.keys(bodyMap).length > 0 && (
        <div className="body-tags-row">
          {Object.entries(bodyMap).map(([zoneId, entry]) => {
            const wi = getWeightedIntensity(entry.intensity, entry.roundLogged, maxRounds);
            return (
              <span key={zoneId} className="body-tag" style={{ background: getSorenessColor(wi) || 'rgba(239,68,68,0.6)' }} onClick={() => handleZoneClick(zoneId)}>
                {ZONE_LABELS_MAP[zoneId] ?? zoneId} {entry.intensity}/10
              </span>
            );
          })}
          <button className="body-clear-btn" onClick={() => onChange({})}>Clear All</button>
        </div>
      )}

      {showLegend && (
        <div className="body-legend">
          {[
            { label: 'Fine', color: 'rgba(34,197,94,0.55)' },
            { label: 'Mild', color: 'rgba(234,179,8,0.65)' },
            { label: 'Moderate', color: 'rgba(249,115,22,0.72)' },
            { label: 'Sore', color: 'rgba(239,68,68,0.80)' },
            { label: 'Severe', color: 'rgba(185,28,28,0.92)' }
          ].map(item => (
            <div key={item.label} className="body-legend-item">
              <div className="body-legend-dot" style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}