/**
 * MelodyForge – Step 4: Model Training on GPU
 * WebGL-accelerated training with live Recharts loss/accuracy curves,
 * circular progress ring with ETA, scrolling terminal log, and IndexedDB persistence.
 */
import React, { useRef, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Play,
  Square,
  Save,
  DownloadCloud,
  ArrowRight,
  Terminal,
  Activity,
  Clock,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { EpochLog, TrainingHyperparams } from '../types';

interface TrainStepProps {
  hyperparams: TrainingHyperparams;
  onChangeHyperparams: (hp: TrainingHyperparams) => void;
  isTraining: boolean;
  trainingProgress: number; // 0 - 100
  currentEpoch: number;
  totalEpochs: number;
  etaSeconds: number;
  currentBatch: number;
  totalBatches: number;
  logs: EpochLog[];
  terminalMessages: string[];
  activeBackend: string;
  hasTrainedModel: boolean;
  hasSavedModelInDb: boolean;
  totalSequences: number;
  onStartTraining: () => void;
  onStopTraining: () => void;
  onSaveToIndexedDb: () => void;
  onLoadFromIndexedDb: () => void;
  onProceed: () => void;
  onRunSelfTest?: () => void;
}

export const TrainStep: React.FC<TrainStepProps> = ({
  hyperparams,
  onChangeHyperparams,
  isTraining,
  trainingProgress,
  currentEpoch,
  totalEpochs,
  etaSeconds,
  currentBatch,
  totalBatches,
  logs,
  terminalMessages,
  activeBackend,
  hasTrainedModel,
  hasSavedModelInDb,
  totalSequences,
  onStartTraining,
  onStopTraining,
  onSaveToIndexedDb,
  onLoadFromIndexedDb,
  onProceed,
  onRunSelfTest,
}) => {
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalMessages]);

  const latestLog = logs[logs.length - 1];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-wider">
            <span>Step 4 of 5</span>
            <span>•</span>
            <span>GPU Optimization</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1 font-display">Train Neural Network in Browser</h2>
          <p className="text-sm text-slate-400 mt-1">
            Execute gradient backpropagation directly on your GPU via TensorFlow.js WebGL with sparse categorical crossentropy.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {onRunSelfTest && (
            <button
              onClick={onRunSelfTest}
              disabled={isTraining}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold transition-all disabled:opacity-50"
              title="Run 1-second automated self-test on float32 tensors and model.fit"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Self-Test</span>
            </button>
          )}

          {hasTrainedModel && (
            <button
              onClick={onSaveToIndexedDb}
              disabled={isTraining}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold transition-all disabled:opacity-50"
              title="Persist trained weights to browser IndexedDB and vocabulary to localStorage"
            >
              <Save className="w-3.5 h-3.5 text-cyan-400" />
              <span>Save Model</span>
            </button>
          )}

          {hasSavedModelInDb && (
            <button
              onClick={onLoadFromIndexedDb}
              disabled={isTraining}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold transition-all disabled:opacity-50"
              title="Restore saved model weights from IndexedDB"
            >
              <DownloadCloud className="w-3.5 h-3.5 text-purple-400" />
              <span>Load Saved</span>
            </button>
          )}

          <button
            onClick={onProceed}
            disabled={!hasTrainedModel || isTraining}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Generate Music</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dataset size warning if < 300 sequences (or blocked if < 20) */}
      {totalSequences < 20 ? (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 text-xs text-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong>Training Blocked:</strong> Only {totalSequences} training sequences. At least 20 sequences are required to train the model. Upload more MIDI files, enable augmentation, or load the sample dataset.
          </div>
        </div>
      ) : totalSequences < 300 ? (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            Only {totalSequences} training sequences. Results will be poor. Upload more MIDI files, enable augmentation, or load the sample dataset.
          </div>
        </div>
      ) : null}

      {/* Hyperparameters Controls Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Epochs */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-white">
            <span className="font-mono text-slate-400 uppercase text-[10px]">Epochs</span>
            <span className="font-mono font-bold text-cyan-300">{hyperparams.epochs}</span>
          </div>
          <input
            type="range"
            min="3"
            max="100"
            step="1"
            disabled={isTraining}
            value={hyperparams.epochs}
            onChange={(e) =>
              onChangeHyperparams({ ...hyperparams, epochs: parseInt(e.target.value, 10) })
            }
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer disabled:opacity-50"
          />
          <span className="text-[10px] text-slate-500 font-mono block">Dataset passes</span>
        </div>

        {/* Batch Size */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-white">
            <span className="font-mono text-slate-400 uppercase text-[10px]">Batch Size</span>
            <span className="font-mono font-bold text-violet-300">{hyperparams.batchSize}</span>
          </div>
          <select
            disabled={isTraining}
            value={hyperparams.batchSize}
            onChange={(e) =>
              onChangeHyperparams({ ...hyperparams, batchSize: parseInt(e.target.value, 10) })
            }
            className="w-full bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono disabled:opacity-50"
          >
            {[16, 32, 64, 128].map((b) => (
              <option key={b} value={b}>
                {b} samples/batch
              </option>
            ))}
          </select>
          <span className="text-[10px] text-slate-500 font-mono block">Weight updates</span>
        </div>

        {/* Learning Rate */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-white">
            <span className="font-mono text-slate-400 uppercase text-[10px]">Learning Rate</span>
            <span className="font-mono font-bold text-amber-300">{hyperparams.learningRate}</span>
          </div>
          <select
            disabled={isTraining}
            value={hyperparams.learningRate}
            onChange={(e) =>
              onChangeHyperparams({ ...hyperparams, learningRate: parseFloat(e.target.value) })
            }
            className="w-full bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono disabled:opacity-50"
          >
            {[0.001, 0.002, 0.005, 0.01].map((lr) => (
              <option key={lr} value={lr}>
                {lr} (Adam)
              </option>
            ))}
          </select>
          <span className="text-[10px] text-slate-500 font-mono block">Step magnitude</span>
        </div>

        {/* Validation Split */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-white">
            <span className="font-mono text-slate-400 uppercase text-[10px]">Val Split</span>
            <span className="font-mono font-bold text-emerald-300">
              {(hyperparams.validationSplit * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="0.2"
            step="0.05"
            disabled={isTraining}
            value={hyperparams.validationSplit}
            onChange={(e) =>
              onChangeHyperparams({ ...hyperparams, validationSplit: parseFloat(e.target.value) })
            }
            className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded cursor-pointer disabled:opacity-50"
          />
          <span className="text-[10px] text-slate-500 font-mono block">Holdout test set</span>
        </div>
      </div>

      {/* Training Action & Progress Ring Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/20 to-slate-900 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          {/* Circular Progress Ring */}
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="7"
                className="text-slate-800 fill-none"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="7"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * trainingProgress) / 100}
                strokeLinecap="round"
                className="text-cyan-400 fill-none transition-all duration-300 shadow-glow"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold text-white font-display">
                {trainingProgress}%
              </span>
              <span className="text-[9px] uppercase font-mono text-slate-400">
                {isTraining ? 'Training' : hasTrainedModel ? 'Ready' : 'Idle'}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white font-display flex items-center justify-center sm:justify-start gap-2">
              <span>Epoch {currentEpoch} of {totalEpochs}</span>
              {isTraining && (
                <span className="inline-flex items-center gap-1 text-xs text-cyan-300 font-mono font-normal">
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  Batch {currentBatch}/{totalBatches}
                </span>
              )}
            </h3>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-300">
              <div className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>ETA: <strong className="text-white font-mono">{etaSeconds}s</strong></span>
              </div>
              <div>
                <span>Loss: </span>
                <strong className="text-violet-300 font-mono">
                  {latestLog ? latestLog.loss.toFixed(4) : '---'}
                </strong>
              </div>
              <div>
                <span>Accuracy: </span>
                <strong className="text-emerald-300 font-mono">
                  {latestLog ? `${(latestLog.accuracy * 100).toFixed(1)}%` : '---'}
                </strong>
              </div>
              <div className="hidden lg:flex items-center gap-1 font-mono text-[11px] text-slate-400">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Backend: <strong className="text-cyan-300">{activeBackend.toUpperCase()}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Start / Stop Button */}
        <div className="flex items-center gap-3">
          {isTraining ? (
            <button
              onClick={onStopTraining}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Stop Training</span>
            </button>
          ) : (
            <button
              onClick={onStartTraining}
              disabled={totalSequences < 20}
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-cyan-500/25 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>{hasTrainedModel ? 'Train More Epochs' : 'Start Training'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Loss & Accuracy Curves + Scrolling Console Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recharts Loss & Accuracy Curves */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white font-display">Live Loss & Accuracy Curves</h3>
              <p className="text-xs text-slate-400 mt-0.5">sparseCategoricalCrossentropy & next-token accuracy</p>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
              {logs.length} Data Points
            </span>
          </div>

          <div className="h-64 w-full">
            {logs.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2 border border-dashed border-white/5 rounded-xl">
                <Activity className="w-8 h-8 text-slate-600 animate-pulse" />
                <span>Loss & accuracy curves will populate live as training progresses.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={logs} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    dataKey="epoch"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    label={{ value: 'Epoch', position: 'insideBottomRight', offset: -5, fill: '#64748B', fontSize: 10 }}
                  />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} domain={[0, 'auto']} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-950 border border-white/10 p-2.5 rounded-lg text-xs shadow-xl space-y-1">
                            <p className="font-semibold text-white">Epoch {label}</p>
                            {payload.map((item, idx) => (
                              <p key={idx} style={{ color: item.color }} className="font-mono">
                                {item.name}: {Number(item.value).toFixed(4)}
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="loss"
                    name="Train Loss"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    name="Train Acc"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  {logs[0]?.valLoss !== undefined && (
                    <Line
                      type="monotone"
                      dataKey="valLoss"
                      name="Val Loss"
                      stroke="#EC4899"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  )}
                  {logs[0]?.valAccuracy !== undefined && (
                    <Line
                      type="monotone"
                      dataKey="valAccuracy"
                      name="Val Acc"
                      stroke="#06B6D4"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Scrolling Console Log */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white font-display flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              Terminal Training Logs
            </h3>
            <span className="text-[10px] font-mono text-slate-500">model.fit()</span>
          </div>

          <div className="flex-1 min-h-[240px] max-h-64 bg-slate-950 rounded-xl p-3 font-mono text-[11px] overflow-y-auto border border-white/5 space-y-1">
            {terminalMessages.length === 0 ? (
              <p className="text-slate-600 italic">Waiting to begin training session...</p>
            ) : (
              terminalMessages.map((msg, idx) => {
                let color = 'text-slate-300';
                if (msg.includes('error') || msg.includes('Error')) color = 'text-rose-400';
                else if (msg.includes('success') || msg.includes('complete')) color = 'text-emerald-400';
                else if (msg.includes('Starting') || msg.includes('Preparing')) color = 'text-cyan-300';
                else if (msg.includes('Epoch')) color = 'text-purple-300';

                return (
                  <div key={idx} className={`leading-snug ${color}`}>
                    <span className="text-slate-600 select-none mr-1.5">&gt;</span>
                    {msg}
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
