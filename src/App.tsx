/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Trophy, 
  RotateCcw, 
  Play, 
  HelpCircle, 
  BarChart3, 
  Settings, 
  Volume2, 
  VolumeX, 
  Copy, 
  Flame, 
  Compass, 
  Info,
  Clock,
  Sparkles,
  Award,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { Difficulty, GameStats, QuizQuestion } from './types';
import { generateQuestion } from './cubeUtils';
import { ProjectionView } from './components/ProjectionView';
import { InteractiveCube } from './components/InteractiveCube';

export default function App() {
  // --- Game Settings State ---
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    return (localStorage.getItem('wirecube_difficulty') as Difficulty) || 'medium';
  });
  const [allowDiagonals, setAllowDiagonals] = useState<boolean>(() => {
    return localStorage.getItem('wirecube_allowDiagonals') === 'true';
  });
  const [includeBokorys, setIncludeBokorys] = useState<boolean>(() => {
    return localStorage.getItem('wirecube_includeBokorys') === 'true';
  });
  const [syncRotation, setSyncRotation] = useState<boolean>(() => {
    const stored = localStorage.getItem('wirecube_syncRotation');
    return stored !== 'false'; // default true
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('wirecube_soundEnabled');
    return stored !== 'false'; // default true
  });
  const [timeLimitEnabled, setTimeLimitEnabled] = useState<boolean>(() => {
    return localStorage.getItem('wirecube_timeLimitEnabled') === 'true';
  });

  // --- Game Statistics State ---
  const initialStats: GameStats = {
    played: 0,
    correct: 0,
    wrong: 0,
    currentStreak: 0,
    longestStreak: 0,
    byDifficulty: {
      easy: { played: 0, correct: 0 },
      medium: { played: 0, correct: 0 },
      hard: { played: 0, correct: 0 },
    },
    totalTimeSeconds: 0,
    averageTimePerCorrect: 0,
  };

  const [stats, setStats] = useState<GameStats>(() => {
    const stored = localStorage.getItem('wirecube_stats');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return initialStats;
      }
    }
    return initialStats;
  });

  // Save Stats and Settings to LocalStorage
  useEffect(() => {
    localStorage.setItem('wirecube_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('wirecube_difficulty', difficulty);
    localStorage.setItem('wirecube_allowDiagonals', String(allowDiagonals));
    localStorage.setItem('wirecube_includeBokorys', String(includeBokorys));
    localStorage.setItem('wirecube_syncRotation', String(syncRotation));
    localStorage.setItem('wirecube_soundEnabled', String(soundEnabled));
    localStorage.setItem('wirecube_timeLimitEnabled', String(timeLimitEnabled));
  }, [difficulty, allowDiagonals, includeBokorys, syncRotation, soundEnabled, timeLimitEnabled]);

  // --- Current Active Question State ---
  const [question, setQuestion] = useState<QuizQuestion>(() => {
    return generateQuestion(difficulty, allowDiagonals, includeBokorys);
  });
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [evaluated, setEvaluated] = useState<boolean>(false);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);

  // --- Timer & Timing Analytics ---
  const [timeRemaining, setTimeRemaining] = useState<number>(45);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // --- Rotation Angles for 3D Viewers ---
  const [sharedYaw, setSharedYaw] = useState<number>(-0.6);
  const [sharedPitch, setSharedPitch] = useState<number>(0.4);
  const [yaws, setYaws] = useState<number[]>([-0.6, -0.6, -0.6]);
  const [pitches, setPitches] = useState<number[]>([0.4, 0.4, 0.4]);

  // --- Modals Toggle ---
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Sound Synth Generator using browser AudioContext
  const playSound = (correct: boolean) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (correct) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
        gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc2.start();
        
        setTimeout(() => {
          try { osc.stop(); osc2.stop(); ctx.close(); } catch(e){}
        }, 500);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(196.00, ctx.currentTime); // G3
        osc.frequency.linearRampToValueAtTime(130.81, ctx.currentTime + 0.35); // C3 slide down
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        
        setTimeout(() => {
          try { osc.stop(); ctx.close(); } catch(e){}
        }, 450);
      }
    } catch (e) {
      console.warn('Audio synthesis blocked or unsupported:', e);
    }
  };

  // Helper to get time limit duration by difficulty
  const getMaxTimeForDifficulty = (diff: Difficulty) => {
    if (diff === 'easy') return 45;
    if (diff === 'medium') return 60;
    return 75;
  };

  // Function to initialize/reset views and start a new random question
  const handleNextQuestion = () => {
    const nextQ = generateQuestion(difficulty, allowDiagonals, includeBokorys);
    setQuestion(nextQ);
    setSelectedOption(null);
    setEvaluated(false);
    setIsTimeUp(false);
    
    // Set standard isometric view angles on new question
    setSharedYaw(-0.6);
    setSharedPitch(0.4);
    setYaws([-0.6, -0.6, -0.6]);
    setPitches([0.4, 0.4, 0.4]);
    
    setTimeRemaining(getMaxTimeForDifficulty(difficulty));
    setQuestionStartTime(Date.now());
  };

  // Auto-regenerate when difficulty/diagonals/views settings change
  useEffect(() => {
    handleNextQuestion();
  }, [difficulty, allowDiagonals, includeBokorys]);

  // Countdown timer logic
  useEffect(() => {
    if (!timeLimitEnabled || evaluated) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimeUp(true);
          // Auto submit current selection (or null if none)
          handleEvaluate(selectedOption, true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLimitEnabled, evaluated, question.id, selectedOption]);

  // Synchronized or independent rotation coordinator
  const handleRotateOption = (index: number, newYaw: number, newPitch: number) => {
    if (syncRotation) {
      setSharedYaw(newYaw);
      setSharedPitch(newPitch);
      setYaws([newYaw, newYaw, newYaw]);
      setPitches([newPitch, newPitch, newPitch]);
    } else {
      setYaws(prev => {
        const copy = [...prev];
        copy[index] = newYaw;
        return copy;
      });
      setPitches(prev => {
        const copy = [...prev];
        copy[index] = newPitch;
        return copy;
      });
    }
  };

  // Snap all rotations back to standard isometric perspective
  const handleResetAngles = () => {
    setSharedYaw(-0.6);
    setSharedPitch(0.4);
    setYaws([-0.6, -0.6, -0.6]);
    setPitches([0.4, 0.4, 0.4]);
  };

  // Submit and evaluate answer
  const handleEvaluate = (optionIdx: number | null, forceWrongTimeUp: boolean = false) => {
    if (evaluated) return;

    const actualSelection = forceWrongTimeUp ? optionIdx : selectedOption;
    const isCorrect = actualSelection === question.correctOptionIndex && !forceWrongTimeUp;
    const timeTaken = (Date.now() - questionStartTime) / 1000;

    setEvaluated(true);
    if (actualSelection !== null) {
      setSelectedOption(actualSelection);
    }

    if (soundEnabled) {
      playSound(isCorrect);
    }

    setStats(prev => {
      const isNowStreak = isCorrect ? prev.currentStreak + 1 : 0;
      const isNewBestStreak = Math.max(prev.longestStreak, isNowStreak);

      const playedInc = prev.played + 1;
      const correctInc = isCorrect ? prev.correct + 1 : prev.correct;
      const wrongInc = isCorrect ? prev.wrong : prev.wrong + 1;

      const diffStats = { ...prev.byDifficulty };
      diffStats[difficulty] = {
        played: diffStats[difficulty].played + 1,
        correct: isCorrect ? diffStats[difficulty].correct + 1 : diffStats[difficulty].correct
      };

      const totalTime = prev.totalTimeSeconds + timeTaken;
      const avgTime = correctInc > 0 
        ? (prev.totalTimeSeconds + (isCorrect ? timeTaken : 0)) / correctInc
        : 0;

      return {
        played: playedInc,
        correct: correctInc,
        wrong: wrongInc,
        currentStreak: isNowStreak,
        longestStreak: isNewBestStreak,
        byDifficulty: diffStats,
        totalTimeSeconds: totalTime,
        averageTimePerCorrect: Number(avgTime.toFixed(1))
      };
    });
  };

  // Clear all statistics
  const handleResetStats = () => {
    if (window.confirm('Opravdu chcete vymazat veškeré uložené statistiky a skóre?')) {
      setStats(initialStats);
      localStorage.removeItem('wirecube_stats');
    }
  };

  // Format statistics for share/export
  const getExportText = () => {
    const accuracy = stats.played > 0 ? Math.round((stats.correct / stats.played) * 100) : 0;
    return `📦 PROJEKCE DRÁTU V KRYCHLI 📦
Vyhodnocení prostorového myšlení

Celkové skóre: ${stats.correct} / ${stats.played} (Úspěšnost: ${accuracy}%)
Nejdelší série: ${stats.longestStreak} správných odpovědí v řadě 🔥
Průměrný čas řešení: ${stats.averageTimePerCorrect} s ⚡

Statistika podle obtížnosti:
- Snadná: ${stats.byDifficulty.easy.correct}/${stats.byDifficulty.easy.played} (${stats.byDifficulty.easy.played > 0 ? Math.round((stats.byDifficulty.easy.correct / stats.byDifficulty.easy.played) * 100) : 0}%)
- Střední: ${stats.byDifficulty.medium.correct}/${stats.byDifficulty.medium.played} (${stats.byDifficulty.medium.played > 0 ? Math.round((stats.byDifficulty.medium.correct / stats.byDifficulty.medium.played) * 100) : 0}%)
- Těžká: ${stats.byDifficulty.hard.correct}/${stats.byDifficulty.hard.played} (${stats.byDifficulty.hard.played > 0 ? Math.round((stats.byDifficulty.hard.correct / stats.byDifficulty.hard.played) * 100) : 0}%)

Trénujte svoji prostorovou představivost v geometrii!`;
  };

  const handleCopyExport = () => {
    navigator.clipboard.writeText(getExportText());
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // General percentage helper
  const globalAccuracy = stats.played > 0 ? Math.round((stats.correct / stats.played) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-12">
      {/* --- Elegant Header --- */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-slate-200 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-600/10">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                Projekce drátu v krychli
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
                Trénink prostorové představivosti
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(prev => !prev)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title={soundEnabled ? "Ztlumit zvuky" : "Zapnout zvuky"}
              id="sound-toggle-btn"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-rose-400" />}
            </button>
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              id="help-btn"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="hidden sm:inline text-xs font-semibold">Návod</span>
            </button>
            <button
              onClick={() => setShowStatsModal(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              id="stats-btn"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="hidden sm:inline text-xs font-semibold">Statistiky</span>
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              id="settings-btn"
            >
              <Settings className="w-5 h-5" />
              <span className="hidden sm:inline text-xs font-semibold">Nastavení</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- Top Score Indicator Belt --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Celkové skóre</p>
              <p className="text-base sm:text-lg font-extrabold text-slate-900">{stats.correct} / {stats.played}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 border-l border-slate-100">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Úspěšnost</p>
              <p className="text-base sm:text-lg font-extrabold text-slate-900">{globalAccuracy}%</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 border-l border-slate-100">
            <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
              <Flame className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Série správně</p>
              <div className="flex items-center gap-1">
                <p className="text-base sm:text-lg font-extrabold text-slate-900">{stats.currentStreak}</p>
                {stats.currentStreak >= 3 && <span className="text-xs">🔥</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 border-l border-slate-100">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rekord série</p>
              <p className="text-base sm:text-lg font-extrabold text-slate-900">{stats.longestStreak} 🏆</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- Main Workspace --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT PANEL: 2D PROJECTIONS (THE PROBLEM STATEMENT) */}
          <section className="lg:col-span-5 flex flex-col gap-5">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                      Zadané 2D projekce drátu
                    </h2>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {difficulty === 'easy' ? 'Snadná' : difficulty === 'medium' ? 'Střední' : 'Těžká'} obtížnost
                  </span>
                </div>

                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Podívejte se pozorně na nákresy projekcí drátu na stěnách krychle. Drát může vést po standardních hranách{allowDiagonals ? ' nebo diagonálách stěn (čárkovaně)' : ''}. Najděte odpovídající 3D model krychle vpravo.
                </p>

                {/* Aligned Monge Projection Layout (Nárys above Půdorys) */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto py-2">
                  {/* Top-Left: Nárys */}
                  <div className="w-full">
                    <ProjectionView path={question.correctPath} view="narys" />
                  </div>

                  {/* Top-Right: Bokorys (or placeholder/instructions) */}
                  <div className="w-full">
                    {includeBokorys ? (
                      <ProjectionView path={question.correctPath} view="bokorys" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-4 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/20 opacity-50 min-h-[180px]">
                        <span className="text-xs text-slate-400 font-bold">Bokorys</span>
                        <span className="text-[10px] text-slate-400 mt-1">Pohled zleva vypnut</span>
                        <span className="text-[9px] text-indigo-500 mt-2 font-medium underline cursor-pointer hover:text-indigo-600" onClick={() => setShowSettingsModal(true)}>
                          Povolit v nastavení
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom-Left: Půdorys (exactly below Nárys) */}
                  <div className="w-full">
                    <ProjectionView path={question.correctPath} view="pudorys" />
                  </div>

                  {/* Bottom-Right: Monge Projection Legend & Info */}
                  <div className="w-full flex flex-col justify-center p-4 border border-slate-150 rounded-2xl bg-slate-50/30 shadow-inner text-center min-h-[180px]">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Mongeovo promítání
                    </h4>
                    <div className="text-[11px] font-mono text-slate-600 space-y-1.5 inline-block text-left mx-auto">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-sm shadow-sky-500/20"></span>
                        <span className="font-sans font-medium text-slate-700">Nárys (zepředu)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20"></span>
                        <span className="font-sans font-medium text-slate-700">Půdorys (shora)</span>
                      </div>
                      {includeBokorys && (
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/20"></span>
                          <span className="font-sans font-medium text-slate-700">Bokorys (zleva)</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-400 mt-3 leading-normal max-w-[150px] mx-auto">
                      Nárys je zobrazen nad půdorysem, jak je zvykem v technickém kreslení.
                    </p>
                  </div>
                </div>
              </div>

              {/* Countdown Timer Widget */}
              {timeLimitEnabled && (
                <div className="mt-8 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      Zbývající čas
                    </span>
                    <span className={`text-xs font-mono font-bold ${timeRemaining <= 10 ? 'text-rose-500 animate-pulse' : 'text-slate-600'}`}>
                      {timeRemaining} s
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 rounded-full ${
                        timeRemaining <= 10 ? 'bg-rose-500' : timeRemaining <= 25 ? 'bg-amber-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${(timeRemaining / getMaxTimeForDifficulty(difficulty)) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT PANEL: 3D OPTIONS (THE INTERACTIVE INTERFACE) */}
          <section className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col h-full justify-between">
              
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Vyberte odpovídající 3D těleso
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetAngles}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-150 transition-all flex items-center gap-1 text-xs font-semibold"
                      title="Obnovit výchozí zobrazení všech krychlí"
                      id="reset-view-btn"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Resetovat rotaci
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Porovnejte prostorové dráty. <strong className="text-indigo-600">Kliknutím a tažením</strong> na libovolné krychli otáčíte všechny modely synchronně, což usnadňuje porovnání! Kliknutím zvolte správné těleso.
                </p>

                {/* 3D Options Rendering */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {question.options.map((pathOption, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = evaluated ? idx === question.correctOptionIndex : null;
                    const letterLabel = String.fromCharCode(65 + idx); // A, B, C

                    return (
                      <InteractiveCube
                        key={`${question.id}-option-${idx}`}
                        path={pathOption}
                        width={160}
                        height={160}
                        yaw={yaws[idx]}
                        pitch={pitches[idx]}
                        onRotate={(y, p) => handleRotateOption(idx, y, p)}
                        isSelected={isSelected}
                        onSelect={() => {
                          if (!evaluated) setSelectedOption(idx);
                        }}
                        isCorrect={isCorrect}
                        showFeedback={evaluated}
                        label={letterLabel}
                        allowDiagonals={allowDiagonals}
                      />
                    );
                  })}
                </div>
              </div>

              {/* ACTION ROW & EVALUATION FEEDBACK */}
              <div className="mt-8 pt-6 border-t border-slate-150">
                {!evaluated ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-400 font-medium">
                      {selectedOption === null 
                        ? "Pro vyhodnocení vyberte jednu z možností A, B nebo C." 
                        : `Zvolili jste možnost ${String.fromCharCode(65 + selectedOption)}. Chcete ji zkontrolovat?`
                      }
                    </p>
                    <button
                      onClick={() => handleEvaluate(selectedOption)}
                      disabled={selectedOption === null}
                      className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-sm tracking-wide shadow-md transition-all duration-200 ${
                        selectedOption === null
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-98'
                      }`}
                      id="evaluate-btn"
                    >
                      Zkontrolovat odpověď
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 animate-fade-in">
                    {/* Feedback Message Bar */}
                    <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                      selectedOption === question.correctOptionIndex
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                        : isTimeUp 
                          ? 'bg-rose-50 border-rose-100 text-rose-800'
                          : 'bg-rose-50 border-rose-100 text-rose-800'
                    }`}>
                      <div className="mt-0.5">
                        {selectedOption === question.correctOptionIndex ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold">
                          {selectedOption === question.correctOptionIndex 
                            ? 'Skvělá práce! Správně.' 
                            : isTimeUp 
                              ? 'Čas vypršel!' 
                              : 'Tato možnost nesouhlasí.'
                          }
                        </h4>
                        <p className="text-xs mt-1 opacity-90 leading-relaxed">
                          {selectedOption === question.correctOptionIndex 
                            ? `Odpověď ${String.fromCharCode(65 + question.correctOptionIndex)} perfektně odpovídá všem zadaným průmětům.` 
                            : `Správná odpověď byla možnost ${String.fromCharCode(65 + question.correctOptionIndex)}. Zkuste v dalším kole sledovat jednotlivé průměty hranu po hraně!`
                          }
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        onClick={handleNextQuestion}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-2"
                        id="next-question-btn"
                      >
                        Další úloha
                        <Play className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </section>

        </div>
      </main>

      {/* --- QUICK HELP ACCORDION BOTTOM GUIDE --- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-slate-100/60 rounded-3xl p-6 border border-slate-200/50">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4.5 h-4.5 text-indigo-500" />
            <h3 className="text-sm font-extrabold text-slate-800">
              Descriptive Geometry Cheat Sheet (Rychlý tahák)
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-500 leading-relaxed">
            <div className="bg-white p-3 rounded-xl border border-slate-100">
              <span className="font-bold text-sky-600 block mb-1">Nárys (Pohled zepředu)</span>
              Projektuje se na svislou rovinu (X, Z). Sledujte šířku (zleva doprava) a výšku (zdola nahoru). Hloubka se v tomto pohledu ztrácí!
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-100">
              <span className="font-bold text-emerald-600 block mb-1">Půdorys (Pohled shora)</span>
              Projektuje se na vodorovnou rovinu (X, Y). Sledujte šířku (zleva doprava) a hloubku (od předu dozadu). Výška se v tomto pohledu ztrácí!
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-100">
              <span className="font-bold text-purple-600 block mb-1">Bokorys (Pohled zleva)</span>
              Projektuje se na boční rovinu (Y, Z). Sledujte hloubku (zepředu dozadu) a výšku (zdola nahoru). Šířka se v tomto pohledu ztrácí!
            </div>
          </div>
        </div>
      </section>

      {/* --- SETTINGS MODAL --- */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full shadow-2xl p-6 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900">Nastavení parametrů hry</h3>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                id="close-settings-btn"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-5">
              {/* Difficulty Settings */}
              <div>
                <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Obtížnost úlohy</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        difficulty === d
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {d === 'easy' ? 'Snadná (3 hrany)' : d === 'medium' ? 'Střední (4 hrany)' : 'Těžká (5-6 hran)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-3.5 border-t border-slate-100 pt-4">
                {/* Diagonals */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Povolit diagonály stěn</span>
                    <span className="text-[10px] text-slate-400">Drát může vést i úhlopříčkou po stěnách krychle (Těžší!)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowDiagonals}
                    onChange={(e) => setAllowDiagonals(e.target.checked)}
                    className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    id="diagonal-checkbox"
                  />
                </div>

                {/* Bokorys */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Zobrazovat Bokorys (Pohled zleva)</span>
                    <span className="text-[10px] text-slate-400">Zobrazí třetí pohled z boku pro přesnější orientaci</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeBokorys}
                    onChange={(e) => setIncludeBokorys(e.target.checked)}
                    className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    id="bokorys-checkbox"
                  />
                </div>

                {/* Time Limit */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Časový limit</span>
                    <span className="text-[10px] text-slate-400">Nastaví odpočet (45s až 75s) na každou úlohu</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={timeLimitEnabled}
                    onChange={(e) => setTimeLimitEnabled(e.target.checked)}
                    className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    id="time-limit-checkbox"
                  />
                </div>

                {/* Sync Rotation */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Společné otáčení</span>
                    <span className="text-[10px] text-slate-400">Při rotaci jednoho 3D modelu se současně otočí i zbylé dva</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={syncRotation}
                    onChange={(e) => setSyncRotation(e.target.checked)}
                    className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    id="sync-rotation-checkbox"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm"
              >
                Uložit a zavřít
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- STATISTICS & EXPORT MODAL --- */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full shadow-2xl p-6 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900">Podrobné statistiky a výsledky</h3>
              </div>
              <button 
                onClick={() => setShowStatsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                id="close-stats-btn"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-5">
              {/* Overall Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Vyřešeno</span>
                  <span className="text-xl font-extrabold text-slate-800">{stats.played}</span>
                  <span className="text-[9px] text-slate-400 block mt-1">celkem úloh</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Úspěšnost</span>
                  <span className="text-xl font-extrabold text-emerald-600">{globalAccuracy}%</span>
                  <span className="text-[9px] text-slate-400 block mt-1">{stats.correct} správně</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Průměrný čas</span>
                  <span className="text-xl font-extrabold text-indigo-600">{stats.averageTimePerCorrect}s</span>
                  <span className="text-[9px] text-slate-400 block mt-1">na správnou úlohu</span>
                </div>
              </div>

              {/* Accuracy per difficulty */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Úspěšnost dle obtížností</h4>
                <div className="flex flex-col gap-2.5 text-xs text-slate-600">
                  {/* Easy */}
                  <div>
                    <div className="flex justify-between mb-1 font-semibold">
                      <span>Snadná obtížnost</span>
                      <span>{stats.byDifficulty.easy.correct}/{stats.byDifficulty.easy.played} ({stats.byDifficulty.easy.played > 0 ? Math.round((stats.byDifficulty.easy.correct / stats.byDifficulty.easy.played) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${stats.byDifficulty.easy.played > 0 ? (stats.byDifficulty.easy.correct / stats.byDifficulty.easy.played) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  {/* Medium */}
                  <div>
                    <div className="flex justify-between mb-1 font-semibold">
                      <span>Střední obtížnost</span>
                      <span>{stats.byDifficulty.medium.correct}/{stats.byDifficulty.medium.played} ({stats.byDifficulty.medium.played > 0 ? Math.round((stats.byDifficulty.medium.correct / stats.byDifficulty.medium.played) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500" 
                        style={{ width: `${stats.byDifficulty.medium.played > 0 ? (stats.byDifficulty.medium.correct / stats.byDifficulty.medium.played) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  {/* Hard */}
                  <div>
                    <div className="flex justify-between mb-1 font-semibold">
                      <span>Těžká obtížnost</span>
                      <span>{stats.byDifficulty.hard.correct}/{stats.byDifficulty.hard.played} ({stats.byDifficulty.hard.played > 0 ? Math.round((stats.byDifficulty.hard.correct / stats.byDifficulty.hard.played) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500" 
                        style={{ width: `${stats.byDifficulty.hard.played > 0 ? (stats.byDifficulty.hard.correct / stats.byDifficulty.hard.played) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Shareable Export Card */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-indigo-50/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-700">Exportovat výsledky pro učitele nebo sdílení</span>
                  <button
                    onClick={handleCopyExport}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded-lg flex items-center gap-1 shadow-sm"
                    id="copy-export-btn"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Zkopírovat report
                  </button>
                </div>
                <textarea
                  readOnly
                  value={getExportText()}
                  className="w-full h-24 p-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-mono text-slate-500 resize-none outline-none focus:ring-1 focus:ring-indigo-300"
                />
                {copiedNotification && (
                  <span className="text-[10px] text-emerald-600 font-bold block mt-1 animate-pulse">
                    ✓ Report byl úspěšně zkopírován do schránky (Clipboard)!
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={handleResetStats}
                className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 font-bold text-xs hover:bg-rose-50 transition-colors"
                id="reset-stats-btn"
              >
                Vynulovat statistiky
              </button>
              <button
                onClick={() => setShowStatsModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HOW TO PLAY GUIDE MODAL --- */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full shadow-2xl p-6 animate-scale-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900">Jak hrát a porozumět projekcím?</h3>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                id="close-help-btn"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 flex flex-col gap-4 leading-relaxed">
              <p>
                Tato aplikace slouží k procvičování <strong>deskriptivní geometrie</strong> a <strong>prostorové představivosti</strong>. Vaším cílem je najít správné 3D drátěné těleso, které odpovídá zadaným 2D průmětům (pohledům z různých stran).
              </p>

              <div>
                <h4 className="font-extrabold text-slate-800 text-sm mb-1.5">Základní pojmy geometrie:</h4>
                <ul className="list-disc pl-5 flex flex-col gap-1.5">
                  <li>
                    <strong className="text-sky-600">Nárys:</strong> Pohled na krychli přímo zepředu. Vidíte osy X (šířka) a Z (výška).
                  </li>
                  <li>
                    <strong className="text-emerald-600">Půdorys:</strong> Pohled na krychli shora dolů. Vidíte osy X (šířka) a Y (hloubka).
                  </li>
                  <li>
                    <strong className="text-purple-600">Bokorys (lze zapnout):</strong> Pohled na krychli z levého boku. Vidíte osy Y (hloubka) a Z (výška).
                  </li>
                </ul>
              </div>

              <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100/50">
                <h4 className="font-extrabold text-indigo-800 mb-1">💡 Užitečná rada pro začátek:</h4>
                <p className="text-slate-600 leading-normal">
                  Projekce v deskriptivní geometrii sdílí souřadnice. Například bod vlevo nahoře v <strong>Nárysu</strong> musí mít stejnou šířku (X) v <strong>Půdorysu</strong>. Každá hrana 3D drátu se promítá buď jako úsečka o plné délce, zkrácená úsečka (diagonály), nebo jako jediný bod (pokud míří přímo proti směru vašeho pohledu).
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-800 text-sm mb-1.5">Jak s modely pracovat?</h4>
                <p>
                  Všechny tři 3D modely napravo můžete <strong>otáčet</strong>. Jednoduše klikněte do libovolné 3D krabičky a táhněte myší/prstem. Výchozí nastavení otáčí všechny modely společně, abyste mohli snadno porovnávat stejný pohled. 
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span>Vytvořeno jako interaktivní učební pomůcka</span>
                <span className="font-bold text-slate-500">2026 Projekce krychle</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
              >
                Rozumím, jdeme na to
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
