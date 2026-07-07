/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { VERTICES, VERTEX_NAMES, FACE_DIAGONALS, getEdgeType } from '../cubeUtils';

interface InteractiveCubeProps {
  path: number[];
  width: number;
  height: number;
  yaw: number;
  pitch: number;
  onRotate: (yaw: number, pitch: number) => void;
  isSelected: boolean;
  onSelect: () => void;
  isCorrect: boolean | null; // true = correct, false = incorrect, null = not evaluated
  showFeedback: boolean;
  label: string; // e.g., "A", "B", "C"
  allowDiagonals: boolean;
}

export const InteractiveCube: React.FC<InteractiveCubeProps> = ({
  path,
  width,
  height,
  yaw,
  pitch,
  onRotate,
  isSelected,
  onSelect,
  isCorrect,
  showFeedback,
  label,
  allowDiagonals,
}) => {
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleStart = (clientX: number, clientY: number) => {
    isDragging.current = true;
    lastPos.current = { x: clientX, y: clientY };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging.current) return;
    const dx = clientX - lastPos.current.x;
    const dy = clientY - lastPos.current.y;
    
    const sensitivity = 0.007;
    let newYaw = yaw + dx * sensitivity;
    let newPitch = pitch + dy * sensitivity;
    
    // Bounds on pitch to avoid inversion confusion
    const maxPitch = Math.PI / 2 - 0.05;
    newPitch = Math.max(-maxPitch, Math.min(maxPitch, newPitch));
    
    onRotate(newYaw, newPitch);
    lastPos.current = { x: clientX, y: clientY };
  };

  const handleEnd = () => {
    isDragging.current = false;
  };

  // Orthographic 3D projection mathematical transformation where:
  // X is width (left-to-right), Y is depth (front-to-back), Z is height (bottom-to-top)
  const project3D = (x: number, y: number, z: number) => {
    // Translate origin to center of cube
    const xc = x - 0.5;
    const yc = y - 0.5;
    const zc = z - 0.5;
    
    // Rotate around vertical Z-axis (yaw)
    const x1 = xc * Math.cos(yaw) - yc * Math.sin(yaw);
    const y1 = xc * Math.sin(yaw) + yc * Math.cos(yaw);
    const z1 = zc;
    
    // Rotate around horizontal screen axis (pitch)
    const z2 = z1 * Math.cos(pitch) - y1 * Math.sin(pitch);
    const y2 = z1 * Math.sin(pitch) + y1 * Math.cos(pitch);
    const x2 = x1;
    
    const scale = width * 0.52; // Fits well within SVG bounds
    const sx = width / 2 + x2 * scale;
    const sy = height / 2 - z2 * scale;
    
    return { x: sx, y: sy, zDepth: y2 };
  };

  const projectedVertices = VERTICES.map(v => project3D(v[0], v[1], v[2]));

  // Standard edges of the cube
  const cubeEdges = [
    [0, 1], [1, 2], [2, 3], [3, 0], // Bottom
    [4, 5], [5, 6], [6, 7], [7, 4], // Top
    [0, 4], [1, 5], [2, 6], [3, 7]  // Verticals
  ];

  // Active path edges
  const pathEdges: { from: number; to: number; type: 'edge' | 'diagonal' }[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const type = getEdgeType(from, to);
    if (type !== 'none') {
      pathEdges.push({ from, to, type: type as 'edge' | 'diagonal' });
    }
  }

  // Styles based on states
  let borderStyle = 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-md';
  let badgeStyle = 'bg-slate-100 text-slate-700';

  if (isSelected) {
    borderStyle = 'border-indigo-600 shadow-md ring-2 ring-indigo-600/10 bg-indigo-50/5';
    badgeStyle = 'bg-indigo-600 text-white';
  }

  if (showFeedback) {
    if (isCorrect === true) {
      borderStyle = 'border-emerald-500 shadow-lg ring-4 ring-emerald-500/10 bg-emerald-50/5';
      badgeStyle = 'bg-emerald-500 text-white';
    } else if (isCorrect === false && isSelected) {
      borderStyle = 'border-rose-400 ring-4 ring-rose-500/10 bg-rose-50/5';
      badgeStyle = 'bg-rose-500 text-white';
    } else if (isCorrect === false) {
      borderStyle = 'border-slate-100 opacity-60';
    }
  }

  let pathColor = '#4f46e5'; // Indigo-600
  if (showFeedback) {
    if (isCorrect === true) {
      pathColor = '#10b981'; // Emerald-500
    } else if (isSelected) {
      pathColor = '#f43f5e'; // Rose-500
    }
  }

  return (
    <div 
      className={`flex flex-col items-center p-4 rounded-3xl border transition-all duration-300 cursor-pointer ${borderStyle}`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between w-full mb-3">
        <span className={`px-3 py-1 text-sm font-extrabold rounded-lg tracking-wider ${badgeStyle}`}>
          Možnost {label}
        </span>
        {showFeedback && isCorrect === true && (
          <span className="text-emerald-600 font-bold text-sm flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            ✓ Správná volba
          </span>
        )}
        {showFeedback && isSelected && isCorrect === false && (
          <span className="text-rose-600 font-bold text-sm flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
            ✕ Tato ne
          </span>
        )}
      </div>

      <div 
        className="relative touch-none overflow-hidden select-none active:cursor-grabbing bg-slate-50/30 rounded-xl border border-slate-50/50 p-2"
        onMouseDown={e => handleStart(e.clientX, e.clientY)}
        onMouseMove={e => handleMove(e.clientX, e.clientY)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={e => { if (e.touches[0]) handleStart(e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchMove={e => { if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchEnd={handleEnd}
      >
        <svg width={width} height={height} className="overflow-visible">
          {/* Outer cube grey wireframe edges */}
          {cubeEdges.map((edge, i) => {
            const p1 = projectedVertices[edge[0]];
            const p2 = projectedVertices[edge[1]];
            return (
              <line
                key={`wire-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#cbd5e1"
                strokeWidth="1.2"
                strokeOpacity="0.8"
              />
            );
          })}

          {/* Render face diagonals as faint dotted reference lines if active */}
          {allowDiagonals && FACE_DIAGONALS.map((edge, i) => {
            const isPath = pathEdges.some(pe => 
              (pe.from === edge[0] && pe.to === edge[1]) || (pe.from === edge[1] && pe.to === edge[0])
            );
            if (isPath) return null;
            const p1 = projectedVertices[edge[0]];
            const p2 = projectedVertices[edge[1]];
            return (
              <line
                key={`diag-hint-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#e2e8f0"
                strokeWidth="0.8"
                strokeDasharray="2,2"
              />
            );
          })}

          {/* Render active wire path edges */}
          {pathEdges.map((edge, i) => {
            const p1 = projectedVertices[edge.from];
            const p2 = projectedVertices[edge.to];
            return (
              <line
                key={`path-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={pathColor}
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray={edge.type === 'diagonal' ? '5,4' : '0'}
                className="drop-shadow-sm animate-pulse"
              />
            );
          })}

          {/* Render active path vertices */}
          {path.map((vIdx, i) => {
            const p = projectedVertices[vIdx];
            return (
              <circle
                key={`joint-${i}`}
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill={pathColor}
                stroke="#ffffff"
                strokeWidth="1.5"
                className="drop-shadow-sm"
              />
            );
          })}

          {/* Labeled corners A-H rotating with the object */}
          {projectedVertices.map((p, i) => {
            return (
              <g key={`lbl-${i}`}>
                <text
                  x={p.x}
                  y={p.y}
                  dx={7}
                  dy={-5}
                  className="text-[10px] font-bold fill-white select-none opacity-90 stroke-white stroke-2 paint-order-stroke"
                >
                  {VERTEX_NAMES[i]}
                </text>
                <text
                  x={p.x}
                  y={p.y}
                  dx={7}
                  dy={-5}
                  className="text-[10px] font-bold fill-slate-500 select-none opacity-80"
                >
                  {VERTEX_NAMES[i]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <span className="text-[10px] text-slate-400 mt-2 text-center pointer-events-none select-none font-medium">
        Uchopte & táhněte pro rotaci 3D
      </span>
    </div>
  );
};
export default InteractiveCube;
