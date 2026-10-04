/**
 * 5-Step Pipeline Stepper
 * Mirrors the ML pipeline: Data -> Preprocess -> Model -> Train -> Generate
 */
import React from 'react';
import { Database, Binary, Cpu, Play, Music2, Check, Lock } from 'lucide-react';
import { StepInfo, StepState } from '../types';

interface StepperProps {
  steps: StepInfo[];
  currentStep: number;
  onSelectStep: (stepId: number) => void;
}

const STEP_ICONS = [Database, Binary, Cpu, Play, Music2];

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep, onSelectStep }) => {
  return (
    <div className="w-full bg-slate-950/60 border-y border-white/10 backdrop-blur-md py-3 px-4">
      <div className="max-w-6xl mx-auto">
        <nav aria-label="Pipeline Progress" className="flex items-center justify-between relative">
          {/* Connector Line behind steps */}
          <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-0.5 bg-slate-800 -z-0" />

          {steps.map((step, idx) => {
            const Icon = STEP_ICONS[idx] || Database;
            const isActive = currentStep === step.id;
            const isCompleted = step.state === 'completed';
            const isLocked = step.state === 'locked';
            const isClickable = !isLocked;

            let badgeBg = 'bg-slate-900 border-slate-700 text-slate-500';
            let iconColor = 'text-slate-500';

            if (isActive) {
              badgeBg = 'bg-gradient-to-tr from-violet-600 to-cyan-500 border-white text-white shadow-lg shadow-purple-500/30 ring-2 ring-purple-500/50';
              iconColor = 'text-white';
            } else if (isCompleted) {
              badgeBg = 'bg-emerald-950 border-emerald-500/50 text-emerald-400';
              iconColor = 'text-emerald-400';
            } else if (step.state === 'ready') {
              badgeBg = 'bg-slate-800 border-slate-600 text-slate-200 hover:border-purple-400';
              iconColor = 'text-cyan-400';
            }

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <button
                  onClick={() => isClickable && onSelectStep(step.id)}
                  disabled={isLocked}
                  className={`group flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-2xl border transition-all duration-200 ${badgeBg} ${
                    isClickable ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-not-allowed opacity-60'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`${step.title} (${step.state})`}
                >
                  {isCompleted && !isActive ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  ) : isLocked ? (
                    <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
                  ) : (
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
                  )}
                </button>

                {/* Step title label */}
                <div className="mt-2 text-center">
                  <div
                    className={`text-[11px] sm:text-xs font-semibold tracking-tight transition-colors ${
                      isActive
                        ? 'text-cyan-300'
                        : isCompleted
                        ? 'text-emerald-300'
                        : isLocked
                        ? 'text-slate-600'
                        : 'text-slate-400'
                    }`}
                  >
                    <span className="hidden md:inline">{step.shortTitle}</span>
                    <span className="md:hidden">Step {step.id}</span>
                  </div>
                  <div className="hidden sm:block text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
                    {step.state}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
