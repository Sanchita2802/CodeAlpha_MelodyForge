/**
 * MelodyForge – Step 3: Neural Model Architecture
 * Sequential LSTM/GRU network with presets ("Fast", "Expressive", "Deep Harmonic"),
 * computational graph diagram, and parameter breakdown table.
 */
import React from 'react';
import { Cpu, Layers, ArrowRight, RefreshCw, Zap, Sparkles } from 'lucide-react';
import { ModelHyperparams, ModelType } from '../types';
import { LayerSummaryItem } from '../utils/model';

interface ModelStepProps {
  hyperparams: ModelHyperparams;
  onChangeHyperparams: (hp: ModelHyperparams) => void;
  vocabSize: number;
  sequenceLength: number;
  layersSummary: LayerSummaryItem[];
  totalParams: number;
  isCompiled: boolean;
  onCompileModel: () => void;
  onProceed: () => void;
}

export const ModelStep: React.FC<ModelStepProps> = ({
  hyperparams,
  onChangeHyperparams,
  vocabSize,
  sequenceLength,
  layersSummary,
  totalParams,
  isCompiled,
  onCompileModel,
  onProceed,
}) => {
  const applyPreset = (preset: 'fast' | 'expressive' | 'deep') => {
    if (preset === 'fast') {
      onChangeHyperparams({
        architecture: 'LSTM',
        layers: 1,
        units: 128,
        dropout: 0.1,
        embeddingDim: 64,
        denseUnits: 64,
      });
    } else if (preset === 'expressive') {
      onChangeHyperparams({
        architecture: 'LSTM',
        layers: 2,
        units: 128,
        dropout: 0.2,
        embeddingDim: 64,
        denseUnits: 64,
      });
    } else {
      onChangeHyperparams({
        architecture: 'GRU',
        layers: 2,
        units: 256,
        dropout: 0.3,
        embeddingDim: 128,
        denseUnits: 128,
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs uppercase tracking-wider">
            <span>Step 3 of 5</span>
            <span>•</span>
            <span>Neural Architecture</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1 font-display">Configure Recurrent Model</h2>
          <p className="text-sm text-slate-400 mt-1">
            Choose between LSTM or GRU recurrent units with sparse categorical crossentropy and GPU tensor acceleration.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={onCompileModel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-sm font-semibold transition-all active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-cyan-400" />
            <span>Rebuild Model</span>
          </button>

          <button
            onClick={onProceed}
            disabled={!isCompiled}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Proceed to Training</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Presets Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/20 to-slate-900 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-xs text-slate-300 font-semibold font-mono flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-400" />
          Recommended Architecture Presets:
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => applyPreset('fast')}
            className="px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition-all"
            title="1 layer, 128 units, embedding 64. Fast 60-second browser training."
          >
            ⚡ Fast (Browser-Friendly)
          </button>
          <button
            onClick={() => applyPreset('expressive')}
            className="px-3 py-1.5 rounded-xl bg-violet-950/60 hover:bg-violet-900/60 border border-violet-500/40 text-violet-300 text-xs font-semibold transition-all"
            title="2 layers, 128 units, embedding 64, dropout 0.2. Optimal melodic phrases."
          >
            ✨ Expressive (Balanced)
          </button>
          <button
            onClick={() => applyPreset('deep')}
            className="px-3 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-all"
            title="2 layers, 256 units, embedding 128, GRU. Deep harmonic capacity."
          >
            🧠 Deep Harmonic
          </button>
        </div>
      </div>

      {/* Architecture Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recurrent Cell Selector */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
          <label className="text-xs font-semibold text-white font-mono uppercase tracking-wider block">
            Recurrent Cell
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['LSTM', 'GRU'] as ModelType[]).map((type) => (
              <button
                key={type}
                onClick={() => onChangeHyperparams({ ...hyperparams, architecture: type })}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs border transition-all ${
                  hyperparams.architecture === type
                    ? 'bg-violet-600/30 border-violet-500 text-white shadow-md shadow-purple-500/20'
                    : 'bg-slate-800/40 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            {hyperparams.architecture === 'LSTM'
              ? 'LSTM: 3 gating units (input, forget, output). Ideal for melody memory.'
              : 'GRU: 2 gating units (reset, update). Faster training and fewer parameters.'}
          </p>
        </div>

        {/* Number of Layers */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
              Recurrent Layers
            </label>
            <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              {hyperparams.layers} Stacked
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => onChangeHyperparams({ ...hyperparams, layers: num })}
                className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                  hyperparams.layers === num
                    ? 'bg-cyan-600/30 border-cyan-500 text-white shadow-md'
                    : 'bg-slate-800/40 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {num} {num === 1 ? 'Layer' : 'Layers'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Stacked recurrent layers enable hierarchical melodic phrasing.
          </p>
        </div>

        {/* Hidden Units */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
              Hidden Units / Layer
            </label>
            <span className="font-mono text-xs font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
              {hyperparams.units}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[64, 128, 256].map((u) => (
              <button
                key={u}
                onClick={() => onChangeHyperparams({ ...hyperparams, units: u })}
                className={`py-2 px-1 rounded-xl font-bold text-xs border transition-all text-center ${
                  hyperparams.units === u
                    ? 'bg-purple-600/30 border-purple-500 text-white'
                    : 'bg-slate-800/40 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            128 units provides optimal memory capacity for browser training.
          </p>
        </div>

        {/* Embedding & Dropout */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
              Embedding & Dropout
            </label>
            <span className="font-mono text-xs font-bold text-amber-300">
              {hyperparams.embeddingDim}d / {(hyperparams.dropout * 100).toFixed(0)}%
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Embedding Dim:</span>
              <select
                value={hyperparams.embeddingDim}
                onChange={(e) =>
                  onChangeHyperparams({ ...hyperparams, embeddingDim: parseInt(e.target.value, 10) })
                }
                className="bg-slate-800 border border-white/10 rounded px-2 py-0.5 text-white font-mono text-xs"
              >
                {[32, 64, 128].map((d) => (
                  <option key={d} value={d}>
                    {d} dims
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Dropout Rate:</span>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.1"
                value={hyperparams.dropout}
                onChange={(e) =>
                  onChangeHyperparams({ ...hyperparams, dropout: parseFloat(e.target.value) })
                }
                className="w-24 accent-purple-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Model Architecture Stacked Diagram */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white font-display flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-400" />
              Computational Graph Visualization
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tensor flow: Integer indices → Dense embeddings → Recurrent layers → Softmax distribution
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Total Trainable Parameters:</span>
            <span className="font-mono font-bold text-cyan-300 text-sm ml-2">
              {totalParams.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Stacked Flow Graphic */}
        <div className="p-6 rounded-xl bg-slate-950/70 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-3 overflow-x-auto">
          {/* Input Block */}
          <div className="flex flex-col items-center min-w-[130px]">
            <div className="p-3 rounded-xl bg-slate-800 border border-white/10 text-center w-full shadow-lg">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Input Shape</span>
              <span className="text-xs font-bold text-white font-mono block mt-1">
                [?, {sequenceLength}]
              </span>
              <span className="text-[9px] text-slate-500 mt-0.5 block">Integer Token IDs</span>
            </div>
            <span className="text-slate-600 text-lg md:rotate-0 rotate-90 my-1 font-bold">→</span>
          </div>

          {/* Embedding Block */}
          <div className="flex flex-col items-center min-w-[130px]">
            <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-500/40 text-center w-full shadow-lg shadow-purple-500/5">
              <span className="text-[10px] uppercase font-mono text-violet-300 block">Embedding</span>
              <span className="text-xs font-bold text-white font-mono block mt-1">
                {vocabSize} → {hyperparams.embeddingDim}
              </span>
              <span className="text-[9px] text-violet-400/80 mt-0.5 block">Dense Latent Matrix</span>
            </div>
            <span className="text-slate-600 text-lg md:rotate-0 rotate-90 my-1 font-bold">→</span>
          </div>

          {/* Recurrent Cell Blocks */}
          {Array.from({ length: hyperparams.layers }).map((_, idx) => (
            <div key={idx} className="flex flex-col items-center min-w-[130px]">
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-center w-full shadow-lg shadow-cyan-500/5">
                <span className="text-[10px] uppercase font-mono text-cyan-300 block">
                  {hyperparams.architecture} Layer {idx + 1}
                </span>
                <span className="text-xs font-bold text-white font-mono block mt-1">
                  {hyperparams.units} units
                </span>
                <span className="text-[9px] text-cyan-400/80 mt-0.5 block">
                  {idx < hyperparams.layers - 1 ? 'returnSequences: true' : 'returnSequences: false'}
                </span>
              </div>
              <span className="text-slate-600 text-lg md:rotate-0 rotate-90 my-1 font-bold">→</span>
            </div>
          ))}

          {/* Dense Latent */}
          <div className="flex flex-col items-center min-w-[130px]">
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-center w-full shadow-lg">
              <span className="text-[10px] uppercase font-mono text-indigo-300 block">Dense (ReLU)</span>
              <span className="text-xs font-bold text-white font-mono block mt-1">
                {hyperparams.denseUnits || Math.floor(hyperparams.units / 2)} units
              </span>
              <span className="text-[9px] text-indigo-400/80 mt-0.5 block">Feature Projection</span>
            </div>
            <span className="text-slate-600 text-lg md:rotate-0 rotate-90 my-1 font-bold">→</span>
          </div>

          {/* Softmax Head */}
          <div className="flex flex-col items-center min-w-[130px]">
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center w-full shadow-lg shadow-emerald-500/5">
              <span className="text-[10px] uppercase font-mono text-emerald-300 block">Softmax Head</span>
              <span className="text-xs font-bold text-white font-mono block mt-1">
                {vocabSize} classes
              </span>
              <span className="text-[9px] text-emerald-400/80 mt-0.5 block">Next-Token Dist.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Model.summary() Table */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white font-display flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Model Specification Table (TensorFlow.js Summary)
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            Adam (lr=0.005) • sparseCategoricalCrossentropy
          </span>
        </div>

        <div className="rounded-xl border border-white/10 overflow-hidden bg-slate-950/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 font-mono border-b border-white/10 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4">#</th>
                <th className="py-2.5 px-4">Layer Name</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Output Shape</th>
                <th className="py-2.5 px-4">Parameters</th>
                <th className="py-2.5 px-4">Activation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {layersSummary.map((layer) => (
                <tr key={layer.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-4 text-slate-500">{layer.id + 1}</td>
                  <td className="py-2.5 px-4 text-white font-semibold">{layer.name}</td>
                  <td className="py-2.5 px-4 text-cyan-300">{layer.type}</td>
                  <td className="py-2.5 px-4 text-violet-300">{layer.outputShape}</td>
                  <td className="py-2.5 px-4 text-amber-300">{layer.paramCount.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-slate-400">{layer.activation || '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900/90 font-mono text-slate-300 border-t border-white/10">
              <tr>
                <td colSpan={4} className="py-2.5 px-4 font-bold text-right text-slate-400">
                  Total Parameters:
                </td>
                <td colSpan={2} className="py-2.5 px-4 font-bold text-cyan-300">
                  {totalParams.toLocaleString()} ({(totalParams * 4 / 1024).toFixed(1)} KB FP32)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
