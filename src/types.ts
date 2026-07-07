/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Point3D = [number, number, number];

export interface Edge {
  from: number; // index of start vertex (0 to 7)
  to: number;   // index of end vertex (0 to 7)
  type: 'edge' | 'diagonal';
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameStats {
  played: number;
  correct: number;
  wrong: number;
  currentStreak: number;
  longestStreak: number;
  byDifficulty: {
    easy: { played: number; correct: number };
    medium: { played: number; correct: number };
    hard: { played: number; correct: number };
  };
  totalTimeSeconds: number;
  averageTimePerCorrect: number;
}

export interface QuizQuestion {
  id: string;
  // The correct path as an ordered list of vertex indices
  correctPath: number[];
  // Three options of paths, index 0, 1, 2, each is a path (number[])
  options: number[][];
  // Index of the correct path within the options array (0, 1, or 2)
  correctOptionIndex: number;
}
