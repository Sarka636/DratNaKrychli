/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VERTICES, getEdgeType } from '../cubeUtils';

interface ProjectionViewProps {
  path: number[];
  view: 'narys' | 'pudorys' | 'bokorys';
}

export const ProjectionView: React.FC<ProjectionViewProps> = ({ path, view }) => {
  const size = 180;
  const padding = 35;
  const scale = size - 2 * padding; // 110px

  const getScreenPos = (cx: number, cy: number) => {
    // We want cy to go bottom-up, so 0 is at bottom, 1 is at top.
    // In screen coordinates, 0 is at top, size is at bottom.
    const sx = padding + cx * scale;
    const sy = padding + (1 - cy) * scale;
    return { x: sx, y: sy };
  };

  // Build projected segments
  const segments: { x1: number; y1: number; x2: number; y2: number; type: 'edge' | 'diagonal' }[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i];
    const v = path[i + 1];
    
    const p1 = VERTICES[u];
    const p2 = VERTICES[v];
    const type = getEdgeType(u, v);
    
    let cx1 = 0, cy1 = 0, cx2 = 0, cy2 = 0;
    
    if (view === 'narys') {
      cx1 = p1[0]; cy1 = p1[2];
      cx2 = p2[0]; cy2 = p2[2];
    } else if (view === 'pudorys') {
      cx1 = p1[0]; cy1 = p1[1];
      cx2 = p2[0]; cy2 = p2[1];
    } else {
      cx1 = p1[1]; cy1 = p1[2];
      cx2 = p2[1]; cy2 = p2[2];
    }
    
    const pos1 = getScreenPos(cx1, cy1);
    const pos2 = getScreenPos(cx2, cy2);
    
    // Skip zero length projected segments (points)
    if (!(cx1 === cx2 && cy1 === cy2)) {
      segments.push({
        x1: pos1.x,
        y1: pos1.y,
        x2: pos2.x,
        y2: pos2.y,
        type: type === 'diagonal' ? 'diagonal' : 'edge'
      });
    }
  }

  // Corner labels
  let corners: { cx: number; cy: number; label: string }[] = [];
  if (view === 'narys') {
    corners = [
      { cx: 0, cy: 0, label: 'A, D' },
      { cx: 1, cy: 0, label: 'B, C' },
      { cx: 0, cy: 1, label: 'E, H' },
      { cx: 1, cy: 1, label: 'F, G' },
    ];
  } else if (view === 'pudorys') {
    corners = [
      { cx: 0, cy: 0, label: 'A, E' },
      { cx: 1, cy: 0, label: 'B, F' },
      { cx: 0, cy: 1, label: 'D, H' },
      { cx: 1, cy: 1, label: 'C, G' },
    ];
  } else {
    corners = [
      { cx: 0, cy: 0, label: 'A, B' },
      { cx: 1, cy: 0, label: 'D, C' },
      { cx: 0, cy: 1, label: 'E, F' },
      { cx: 1, cy: 1, label: 'H, G' },
    ];
  }

  const title = view === 'narys' 
    ? 'Nárys (pohled zepředu)' 
    : view === 'pudorys' 
      ? 'Půdorys (pohled shora)' 
      : 'Bokorys (pohled zleva)';

  const accentColorClass = view === 'narys' 
    ? 'text-sky-700 bg-sky-50 border-sky-150' 
    : view === 'pudorys' 
      ? 'text-emerald-700 bg-emerald-50 border-emerald-150' 
      : 'text-purple-700 bg-purple-50 border-purple-150';

  const strokeColor = view === 'narys'
    ? '#0284c7' // sky-600
    : view === 'pudorys'
      ? '#10b981' // emerald-500
      : '#8b5cf6'; // purple-500

  return (
    <div className="flex flex-col items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-sm w-full max-w-[210px] mx-auto">
      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border mb-3 text-center ${accentColorClass}`}>
        {title}
      </span>
      <div className="relative p-1 bg-white rounded-lg border border-slate-100 shadow-inner">
        <svg width={size} height={size} className="overflow-visible">
          {/* Coordinate helper gridlines */}
          <line x1={padding} y1={padding + scale/2} x2={padding + scale} y2={padding + scale/2} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
          <line x1={padding + scale/2} y1={padding} x2={padding + scale/2} y2={padding + scale} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
          
          {/* Main projection square outline */}
          <rect 
            x={padding} 
            y={padding} 
            width={scale} 
            height={scale} 
            fill="none" 
            stroke="#cbd5e1" 
            strokeWidth="1.5" 
            strokeDasharray="4,4" 
            rx="1.5"
          />

          {/* Corner vertex cluster labels */}
          {corners.map((c, i) => {
            const pos = getScreenPos(c.cx, c.cy);
            const dx = c.cx === 0 ? -12 : 12;
            const dy = c.cy === 0 ? 12 : -8;
            const textAnchor = c.cx === 0 ? 'end' : 'start';
            return (
              <g key={i}>
                <circle cx={pos.x} cy={pos.y} r="3" fill="#94a3b8" />
                <text 
                  x={pos.x} 
                  y={pos.y} 
                  dx={dx} 
                  dy={dy} 
                  textAnchor={textAnchor}
                  className="text-[10px] font-mono fill-slate-400 select-none font-bold"
                >
                  {c.label}
                </text>
              </g>
            );
          })}

          {/* Projected wire lines */}
          {segments.map((seg, i) => (
            <line
              key={i}
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
              stroke={strokeColor}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={seg.type === 'diagonal' ? '5,5' : '0'}
              className="drop-shadow-sm"
            />
          ))}

          {/* Projected wire vertices */}
          {path.map((vIdx, i) => {
            const p = VERTICES[vIdx];
            let cx = 0, cy = 0;
            if (view === 'narys') {
              cx = p[0]; cy = p[2];
            } else if (view === 'pudorys') {
              cx = p[0]; cy = p[1];
            } else {
              cx = p[1]; cy = p[2];
            }
            const pos = getScreenPos(cx, cy);
            return (
              <circle
                key={i}
                cx={pos.x}
                cy={pos.y}
                r="5"
                fill={strokeColor}
                stroke="#ffffff"
                strokeWidth="1.8"
                className="drop-shadow-sm"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};
