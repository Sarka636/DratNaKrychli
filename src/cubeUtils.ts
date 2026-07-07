/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Point3D, Difficulty, QuizQuestion } from './types';

export const VERTICES: Point3D[] = [
  [0, 0, 0], // 0: A
  [1, 0, 0], // 1: B
  [1, 1, 0], // 2: C
  [0, 1, 0], // 3: D
  [0, 0, 1], // 4: E
  [1, 0, 1], // 5: F
  [1, 1, 1], // 6: G
  [0, 1, 1], // 7: H
];

export const VERTEX_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export const FACE_DIAGONALS: [number, number][] = [
  [0, 2], [1, 3], // Bottom face (Z=0)
  [4, 6], [5, 7], // Top face (Z=1)
  [0, 5], [1, 4], // Front face (Y=0)
  [2, 7], [3, 6], // Back face (Y=1)
  [0, 7], [3, 4], // Left face (X=0)
  [1, 6], [2, 5], // Right face (X=1)
];

// Helper to determine the type of edge connecting two vertices
export function getEdgeType(v1: number, v2: number): 'edge' | 'diagonal' | 'none' {
  const p1 = VERTICES[v1];
  const p2 = VERTICES[v2];
  const dx = Math.abs(p1[0] - p2[0]);
  const dy = Math.abs(p1[1] - p2[1]);
  const dz = Math.abs(p1[2] - p2[2]);
  const sum = dx + dy + dz;
  
  if (sum === 1) return 'edge';
  if (sum === 2 && (dx === 0 || dy === 0 || dz === 0)) return 'diagonal';
  return 'none';
}

// Generate a random self-avoiding path on the cube graph of a specific length (in number of edges)
export function generateRandomPath(length: number, allowDiagonals: boolean): number[] {
  const maxRetries = 150;
  
  for (let retry = 0; retry < maxRetries; retry++) {
    const path: number[] = [];
    const visited = new Set<number>();
    
    // Start at a random vertex
    let current = Math.floor(Math.random() * 8);
    path.push(current);
    visited.add(current);
    
    let success = true;
    for (let step = 0; step < length; step++) {
      const neighbors: number[] = [];
      for (let next = 0; next < 8; next++) {
        if (visited.has(next)) continue;
        const type = getEdgeType(current, next);
        if (type === 'edge' || (allowDiagonals && type === 'diagonal')) {
          neighbors.push(next);
        }
      }
      
      if (neighbors.length === 0) {
        success = false;
        break; // Stuck, retry
      }
      
      const nextVertex = neighbors[Math.floor(Math.random() * neighbors.length)];
      path.push(nextVertex);
      visited.add(nextVertex);
      current = nextVertex;
    }
    
    if (success && path.length === length + 1) {
      return path;
    }
  }
  
  // Reliable fallbacks in case of extremely constrained search
  return allowDiagonals 
    ? [0, 2, 6, 7, 5] 
    : [0, 1, 2, 6, 7];
}

// Get ordered list of edges for a vertex sequence
export function getPathEdges(path: number[]): { from: number; to: number; type: 'edge' | 'diagonal' }[] {
  const edges: { from: number; to: number; type: 'edge' | 'diagonal' }[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const type = getEdgeType(from, to);
    if (type !== 'none') {
      edges.push({ from, to, type: type as 'edge' | 'diagonal' });
    }
  }
  return edges;
}

// Check if two paths represent the exact same 3D structure
export function arePathsEquivalent(p1: number[], p2: number[]): boolean {
  if (p1.length !== p2.length) return false;
  
  const len = p1.length;
  let forwardMatch = true;
  let backwardMatch = true;
  
  for (let i = 0; i < len; i++) {
    if (p1[i] !== p2[i]) forwardMatch = false;
    if (p1[i] !== p2[len - 1 - i]) backwardMatch = false;
  }
  
  if (forwardMatch || backwardMatch) return true;
  
  // Also compare as undirected edge sets
  const edges1 = getPathEdges(p1);
  const edges2 = getPathEdges(p2);
  
  if (edges1.length !== edges2.length) return false;
  
  let matchCount = 0;
  for (const e1 of edges1) {
    const match = edges2.some(e2 => 
      (e1.from === e2.from && e1.to === e2.to) || 
      (e1.from === e2.to && e1.to === e2.from)
    );
    if (match) matchCount++;
  }
  
  return matchCount === edges1.length;
}

// Extract 2D projected line segments to compare visual equivalence of projection drawings
export function getProjectionSegments(path: number[], view: 'narys' | 'pudorys' | 'bokorys'): string[] {
  const segments = new Set<string>();
  
  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i];
    const v = path[i + 1];
    
    const p1 = VERTICES[u];
    const p2 = VERTICES[v];
    
    let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
    
    if (view === 'narys') {
      // Front view: X and Z axes
      x1 = p1[0]; y1 = p1[2];
      x2 = p2[0]; y2 = p2[2];
    } else if (view === 'pudorys') {
      // Top view: X and Y axes
      x1 = p1[0]; y1 = p1[1];
      x2 = p2[0]; y2 = p2[1];
    } else {
      // Side view: Y and Z axes
      x1 = p1[1]; y1 = p1[2];
      x2 = p2[1]; y2 = p2[2];
    }
    
    // Ignore lines of zero projected length (points)
    if (x1 === x2 && y1 === y2) {
      continue;
    }
    
    // Sort coordinates to keep lines undirected
    const key = `${x1},${y1}-${x2},${y2}`;
    const revKey = `${x2},${y2}-${x1},${y1}`;
    if (key < revKey) {
      segments.add(key);
    } else {
      segments.add(revKey);
    }
  }
  
  return Array.from(segments).sort();
}

// Checks if two paths have identical 2D line segments under the chosen active projection views
export function areProjectionsIdentical(path1: number[], path2: number[], includeBokorys: boolean): boolean {
  const views: ('narys' | 'pudorys' | 'bokorys')[] = includeBokorys 
    ? ['narys', 'pudorys', 'bokorys'] 
    : ['narys', 'pudorys'];
    
  for (const view of views) {
    const segs1 = getProjectionSegments(path1, view);
    const segs2 = getProjectionSegments(path2, view);
    if (segs1.join('|') !== segs2.join('|')) {
      return false; // Found a view where projections are different
    }
  }
  
  return true; // Projections are completely indistinguishable under enabled views
}

// Generate the fully formulated multiple choice task
export function generateQuestion(difficulty: Difficulty, allowDiagonals: boolean, includeBokorys: boolean): QuizQuestion {
  let pathLength = 4;
  if (difficulty === 'easy') {
    pathLength = 3;
  } else if (difficulty === 'medium') {
    pathLength = 4;
  } else {
    // Hard can be 5 or 6 edges depending on diagonals
    pathLength = allowDiagonals ? 5 : 6;
  }
  
  // 1. Generate the correct path
  const correctPath = generateRandomPath(pathLength, allowDiagonals);
  
  // 2. Generate two distractors with the same properties but different 2D/3D representation
  const distractors: number[][] = [];
  const maxAttempts = 500;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateRandomPath(pathLength, allowDiagonals);
    
    // Distractor must not be 3D equivalent to correct path
    if (arePathsEquivalent(correctPath, candidate)) continue;
    
    // Distractor must not be 3D equivalent to already chosen distractors
    const alreadyExists = distractors.some(d => arePathsEquivalent(d, candidate));
    if (alreadyExists) continue;
    
    // CRITICAL: Distractor must have different 2D projections so there is only one correct option!
    if (areProjectionsIdentical(correctPath, candidate, includeBokorys)) continue;
    
    distractors.push(candidate);
    if (distractors.length === 2) break;
  }
  
  // Fail-safe fallbacks if search is too restricted
  while (distractors.length < 2) {
    const fallback = generateRandomPath(pathLength, allowDiagonals);
    if (!arePathsEquivalent(correctPath, fallback) && !distractors.some(d => arePathsEquivalent(d, fallback))) {
      distractors.push(fallback);
    }
  }
  
  // 3. Shuffle options and track the correct one
  const options = [correctPath, distractors[0], distractors[1]];
  const indices = [0, 1, 2];
  indices.sort(() => Math.random() - 0.5);
  
  const shuffledOptions: number[][] = [];
  let correctOptionIndex = 0;
  
  for (let i = 0; i < 3; i++) {
    shuffledOptions.push(options[indices[i]]);
    if (indices[i] === 0) {
      correctOptionIndex = i;
    }
  }
  
  return {
    id: Math.random().toString(36).substring(2, 9),
    correctPath,
    options: shuffledOptions,
    correctOptionIndex,
  };
}
