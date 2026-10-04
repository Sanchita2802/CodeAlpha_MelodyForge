/**
 * MelodyForge – AI Music Generator
 * In-browser neural music generation with TensorFlow.js WebGL & Tone.js polyphonic synthesis.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as tf from '@tensorflow/tfjs';
import {
  MidiFileData,
  PreprocessConfig,
  PreprocessedData,
  ModelHyperparams,
  TrainingHyperparams,
  EpochLog,
  GenerateConfig,
  GeneratedSong,
  StepInfo,
  ToastMessage,
  NoteEvent,
} from './types';
import { getFullSampleDataset } from './utils/sampleData';
import { buildVocabularyAndSequences } from './utils/vocab';
import { buildMusicModel, LayerSummaryItem } from './utils/model';
import { ModelTrainer } from './utils/trainer';
import {
  generateSequence,
  generateRandomBaseline,
  tokensToNoteEvents,
} from './utils/sampler';
import { AudioEngine } from './utils/audioEngine';
import { Navbar } from './components/Navbar';
import { Stepper } from './components/Stepper';
import { Hero } from './components/Hero';
import { DataStep } from './components/DataStep';
import { PreprocessStep } from './components/PreprocessStep';
import { ModelStep } from './components/ModelStep';
import { TrainStep } from './components/TrainStep';
import { GenerateStep } from './components/GenerateStep';
import { Gallery } from './components/Gallery';
import { AboutModal } from './components/AboutModal';
import { ToastContainer } from './components/Toast';
import { EnableSoundBanner } from './components/EnableSoundBanner';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeBackend, setActiveBackend] = useState<string>('webgl');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Navigation Steps
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: MIDI Data (Default: 48 varied compositions across 4 genres)
  const [midiFiles, setMidiFiles] = useState<MidiFileData[]>(() => getFullSampleDataset());
  const [selectedGenres, setSelectedGenres] = useState<string[]>([
    'Classical',
    'Jazz',
    'Blues',
    'Folk',
  ]);

  // Step 2: Preprocessing Config (Default: includeDuration = true, vocabCap = 300, augmentTranspose = true)
  const [preprocessConfig, setPreprocessConfig] = useState<PreprocessConfig>({
    sequenceLength: 32,
    includeDuration: true,
    mergeAllTracks: false,
    vocabCap: 300,
    augmentTranspose: true,
  });

  // Step 3: Model Architecture (Default preset: Fast browser-friendly 1-layer 128 units)
  const [modelHyperparams, setModelHyperparams] = useState<ModelHyperparams>({
    architecture: 'LSTM',
    layers: 1,
    units: 128,
    dropout: 0.1,
    embeddingDim: 64,
    denseUnits: 64,
  });

  const [activeModel, setActiveModel] = useState<tf.Sequential | null>(null);
  const [layersSummary, setLayersSummary] = useState<LayerSummaryItem[]>([]);
  const [totalParams, setTotalParams] = useState<number>(0);
  const [isModelCompiled, setIsModelCompiled] = useState<boolean>(false);

  // Step 4: Training State (Default: 20 epochs, batch size 64, lr 0.005)
  const [trainingHyperparams, setTrainingHyperparams] = useState<TrainingHyperparams>({
    epochs: 20,
    batchSize: 64,
    learningRate: 0.005,
    validationSplit: 0.1,
  });

  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingProgress, setTrainingProgress] = useState<number>(0);
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  const [etaSeconds, setEtaSeconds] = useState<number>(0);
  const [currentBatch, setCurrentBatch] = useState<number>(0);
  const [totalBatches, setTotalBatches] = useState<number>(0);
  const [trainingLogs, setTrainingLogs] = useState<EpochLog[]>([]);
  const [terminalMessages, setTerminalMessages] = useState<string[]>([]);
  const [hasTrainedModel, setHasTrainedModel] = useState<boolean>(false);
  const [hasSavedModelInDb, setHasSavedModelInDb] = useState<boolean>(false);

  const trainerRef = useRef<ModelTrainer>(new ModelTrainer());

  // Step 5: Generation State (Default: 100 notes, temperature 0.9, piano synth)
  const [generateConfig, setGenerateConfig] = useState<GenerateConfig>({
    notesCount: 100,
    temperature: 0.9,
    tempo: 116,
    instrument: 'piano',
    seedChoice: 'random',
  });

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generatedTokens, setGeneratedTokens] = useState<string[]>([]);
  const [generatedNotes, setGeneratedNotes] = useState<NoteEvent[]>([]);

  // Compositions Gallery
  const [savedGallery, setSavedGallery] = useState<GeneratedSong[]>(() => {
    try {
      const stored = localStorage.getItem('melodyforge_gallery');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Quick Demo runner state & step overlay
  const [isQuickDemoRunning, setIsQuickDemoRunning] = useState<boolean>(false);
  const [quickDemoStepText, setQuickDemoStepText] = useState<string>('');

  // Audio Engine instance
  const audioEngine = AudioEngine.getInstance();

  // Section 9.1 & 9.9: Unlock audio on user interaction and monitor status
  useEffect(() => {
    const checkAudio = () => {
      setIsAudioUnlocked(audioEngine.isUnlocked());
    };

    // Global listener to silently unlock audio on first user touch/click anywhere
    const handleGlobalClick = async () => {
      await audioEngine.unlockAudio();
      checkAudio();
    };

    window.addEventListener('click', handleGlobalClick, { once: true });
    window.addEventListener('keydown', handleGlobalClick, { once: true });

    const interval = setInterval(checkAudio, 1000);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleGlobalClick);
      clearInterval(interval);
    };
  }, []);

  // Initialize TensorFlow.js backend and check for persisted model
  useEffect(() => {
    const initTf = async () => {
      try {
        await tf.ready();
        setActiveBackend(tf.getBackend());
        const hasSaved = await trainerRef.current.hasSavedModel();
        setHasSavedModelInDb(hasSaved);
      } catch (err) {
        console.warn('TensorFlow.js init:', err);
      }
    };
    initTf();
  }, []);

  // Compute preprocessed dataset with duration bucketing and vocabulary capping
  const preprocessedData: PreprocessedData = useMemo(() => {
    const allTokens = midiFiles.map((f) => f.tokens);
    const totalNotes = midiFiles.reduce((acc, f) => acc + f.totalNotes, 0);
    return buildVocabularyAndSequences(
      allTokens,
      preprocessConfig,
      totalNotes,
      midiFiles.length
    );
  }, [midiFiles, preprocessConfig]);

  // Section C.5: Auto-adapt sequence length if dataset is small
  useEffect(() => {
    const totalTokens = midiFiles.reduce((acc, f) => acc + f.tokens.length, 0);
    if (
      midiFiles.length > 0 &&
      totalTokens > 0 &&
      totalTokens < 120 &&
      preprocessConfig.sequenceLength > 24
    ) {
      setPreprocessConfig((prev) => ({ ...prev, sequenceLength: 24 }));
      showToast(
        'Sequence Length Auto-Adapted',
        'Dataset is small; automatically reduced sequence length to 24 to maximize training sequences.',
        'info'
      );
    }
  }, [midiFiles]);

  // Toast Notification helper
  const showToast = (
    title: string,
    message?: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { id, title, message, type };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Compile / Rebuild Model (Instant initialization via glorotUniform)
  const compileCurrentModel = (silent = false) => {
    if (preprocessedData.vocab.length < 2) {
      if (!silent) {
        showToast('Need Vocabulary', 'Preprocess at least 2 unique musical tokens first', 'warning');
      }
      return;
    }

    try {
      const result = buildMusicModel(
        preprocessedData.vocab.length,
        preprocessConfig.sequenceLength,
        modelHyperparams,
        trainingHyperparams.learningRate
      );

      setActiveModel(result.model);
      setLayersSummary(result.layersSummary);
      setTotalParams(result.totalParams);
      setIsModelCompiled(true);

      if (!silent) {
        showToast(
          'Neural Model Compiled',
          `${modelHyperparams.architecture} with ${result.totalParams.toLocaleString()} trainable parameters ready.`,
          'success'
        );
      }
    } catch (err) {
      if (!silent) showToast('Model Compilation Error', (err as Error).message, 'error');
    }
  };

  // Auto-compile model lazily when user navigates to Step 3
  useEffect(() => {
    if (currentStep >= 3 && preprocessedData.vocab.length >= 2 && !activeModel) {
      compileCurrentModel(true);
    }
  }, [currentStep, preprocessedData.vocab.length]);

  // Stepper state tracking
  const steps: StepInfo[] = [
    {
      id: 1,
      title: 'Step 1: Collect MIDI Data',
      shortTitle: '1. Data',
      description: 'Upload or pick sample datasets',
      state: midiFiles.length > 0 ? (currentStep === 1 ? 'active' : 'completed') : 'active',
    },
    {
      id: 2,
      title: 'Step 2: Preprocess Sequences',
      shortTitle: '2. Preprocess',
      description: 'music21 extraction & sliding window',
      state:
        midiFiles.length === 0
          ? 'locked'
          : currentStep === 2
          ? 'active'
          : preprocessedData.totalSequences > 0
          ? 'completed'
          : 'ready',
    },
    {
      id: 3,
      title: 'Step 3: Neural Architecture',
      shortTitle: '3. Model',
      description: 'LSTM/GRU layer configuration',
      state:
        preprocessedData.totalSequences === 0
          ? 'locked'
          : currentStep === 3
          ? 'active'
          : isModelCompiled
          ? 'completed'
          : 'ready',
    },
    {
      id: 4,
      title: 'Step 4: Train on GPU',
      shortTitle: '4. Train',
      description: 'WebGL backpropagation & live curves',
      state:
        !isModelCompiled
          ? 'locked'
          : currentStep === 4
          ? 'active'
          : hasTrainedModel
          ? 'completed'
          : 'ready',
    },
    {
      id: 5,
      title: 'Step 5: Generate & Compose',
      shortTitle: '5. Generate',
      description: 'Audible synthesis & MIDI/WAV export',
      state:
        !hasTrainedModel
          ? 'locked'
          : currentStep === 5
          ? 'active'
          : generatedNotes.length > 0
          ? 'completed'
          : 'ready',
    },
  ];

  // Section 9.5: Test Sound Trigger
  const handleTestSound = async () => {
    await audioEngine.playTestSound();
    setIsAudioUnlocked(true);
  };

  // Start Training
  const handleStartTraining = async () => {
    if (preprocessedData.sequences.length < 20) {
      showToast(
        'Training Blocked',
        `Only ${preprocessedData.sequences.length} training sequences. At least 20 sequences are required to train. Load the sample dataset or upload more MIDI files.`,
        'error'
      );
      return;
    }

    let modelToTrain = activeModel;
    // Check if model needs compilation or rebuilding for current vocab size / sequence length
    const needsBuild =
      !modelToTrain ||
      !isModelCompiled ||
      (modelToTrain.layers[0] as unknown as { inputDim?: number })?.inputDim !== preprocessedData.vocab.length ||
      (modelToTrain.layers[0] as unknown as { inputLength?: number })?.inputLength !== preprocessConfig.sequenceLength;

    if (needsBuild) {
      if (preprocessedData.vocab.length < 2) {
        showToast('Need Vocabulary', 'Preprocess at least 2 unique musical tokens first', 'warning');
        return;
      }
      try {
        const result = buildMusicModel(
          preprocessedData.vocab.length,
          preprocessConfig.sequenceLength,
          modelHyperparams,
          trainingHyperparams.learningRate,
          modelToTrain
        );
        modelToTrain = result.model;
        setActiveModel(result.model);
        setLayersSummary(result.layersSummary);
        setTotalParams(result.totalParams);
        setIsModelCompiled(true);
      } catch (err) {
        showToast('Model Compilation Error', (err as Error).message, 'error');
        return;
      }
    }

    setIsTraining(true);
    setTrainingProgress(0);
    setCurrentEpoch(0);
    setEtaSeconds(0);
    setTrainingLogs([]);
    setTerminalMessages([]);

    const success = await trainerRef.current.train(
      modelToTrain!,
      preprocessedData.sequences,
      preprocessedData.nextTokens,
      preprocessedData.vocab.length,
      trainingHyperparams,
      {
        onEpochEnd: (log, progress, eta) => {
          setTrainingLogs((prev) => [...prev, log]);
          setCurrentEpoch(log.epoch);
          setTrainingProgress(progress);
          setEtaSeconds(eta);
        },
        onBatchEnd: (batch, total) => {
          setCurrentBatch(batch);
          setTotalBatches(total);
        },
        onLog: (msg) => {
          setTerminalMessages((prev) => [...prev.slice(-80), msg]);
        },
        onError: (err) => {
          showToast('Training Error', err, 'error');
        },
      }
    );

    setIsTraining(false);
    if (success) {
      setHasTrainedModel(true);
      showToast(
        'Training Complete!',
        'Model weights optimized. Proceed to Step 5 to generate original compositions!',
        'success'
      );
    }
  };

  const handleRunSelfTest = async () => {
    setTerminalMessages((prev) => [
      ...prev,
      '--- Launching Self-Test (testing float32 tensors & sparseCategoricalCrossentropy) ---',
    ]);
    const res = await ModelTrainer.runSelfTest((msg) => {
      setTerminalMessages((prev) => [...prev.slice(-80), msg]);
    });
    if (res.success) {
      showToast('Self-Test Passed', res.message, 'success');
    } else {
      showToast('Self-Test Failed', res.message, 'error');
    }
  };

  const handleStopTraining = () => {
    trainerRef.current.stop();
    setIsTraining(false);
    showToast('Training Stopped', 'Training was interrupted by user.', 'info');
  };

  const handleSaveToIndexedDb = async () => {
    if (!activeModel) return;
    const ok = await trainerRef.current.saveModel(activeModel, preprocessedData.vocab);
    if (ok) {
      setHasSavedModelInDb(true);
      showToast('Model Saved', 'Neural weights and vocabulary persisted to IndexedDB', 'success');
    } else {
      showToast('Save Failed', 'Could not save model to IndexedDB', 'error');
    }
  };

  const handleLoadFromIndexedDb = async () => {
    const loaded = await trainerRef.current.loadModel();
    if (loaded) {
      setActiveModel(loaded.model as tf.Sequential);
      setHasTrainedModel(true);
      setIsModelCompiled(true);
      showToast('Model Restored', 'Loaded model weights from IndexedDB', 'success');
    } else {
      showToast('Load Failed', 'No saved model found in IndexedDB', 'warning');
    }
  };

  // Step 5: Generate Music
  const handleGenerateMusic = async () => {
    if (!activeModel) {
      showToast('Model Not Built', 'Build or load a model first', 'warning');
      return;
    }

    if (preprocessedData.vocab.length === 0) {
      showToast('Empty Vocabulary', 'Preprocess data first', 'warning');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    // Pick seed
    let seed: number[] = [];
    if (generateConfig.seedChoice === 'random' && preprocessedData.sequences.length > 0) {
      const randIdx = Math.floor(Math.random() * preprocessedData.sequences.length);
      seed = [...preprocessedData.sequences[randIdx]];
    } else if (generateConfig.seedChoice === 'first' && preprocessedData.sequences.length > 0) {
      seed = [...preprocessedData.sequences[0]];
    } else {
      // Tonic C4 seed
      const tonicIdx = preprocessedData.tokenToIndex['C4|0.5'] || preprocessedData.tokenToIndex['C4'] || 1;
      seed = new Array(preprocessConfig.sequenceLength).fill(tonicIdx);
    }

    try {
      const tokens = await generateSequence(
        activeModel,
        seed,
        preprocessConfig.sequenceLength,
        generateConfig.notesCount,
        generateConfig.temperature,
        preprocessedData.vocab,
        (prog) => {
          setGenerationProgress(Math.round((prog.step / prog.total) * 100));
        }
      );

      // Sanity check: must generate at least 8 notes
      if (tokens.length < 8) {
        showToast(
          'Generation Incomplete',
          'Model generated fewer than 8 notes. Please try training for more epochs or increasing temperature.',
          'warning'
        );
        setIsGenerating(false);
        return;
      }

      setGeneratedTokens(tokens);
      const notes = tokensToNoteEvents(tokens, generateConfig.tempo);
      setGeneratedNotes(notes);

      showToast(
        'Melody Generated!',
        `Composed ${notes.length} notes with ${generateConfig.instrument}. Press Play to listen!`,
        'success'
      );
    } catch (err) {
      showToast('Generation Error', (err as Error).message, 'error');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(100);
    }
  };

  // Section 6: Generate Random-notes baseline
  const handleGenerateRandomBaseline = () => {
    const tokens = generateRandomBaseline(preprocessedData.vocab, generateConfig.notesCount);
    setGeneratedTokens(tokens);
    const notes = tokensToNoteEvents(tokens, generateConfig.tempo);
    setGeneratedNotes(notes);
    showToast(
      'Random Baseline Generated',
      `Sampled ${notes.length} random notes from the vocabulary for comparative listening.`,
      'info'
    );
  };

  // Save to Gallery
  const handleSaveToGallery = (song: GeneratedSong) => {
    const updated = [song, ...savedGallery.filter((s) => s.id !== song.id)];
    setSavedGallery(updated);
    try {
      localStorage.setItem('melodyforge_gallery', JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  };

  const handleDeleteSong = (id: string) => {
    const updated = savedGallery.filter((s) => s.id !== id);
    setSavedGallery(updated);
    localStorage.setItem('melodyforge_gallery', JSON.stringify(updated));
    showToast('Deleted', 'Composition removed from gallery', 'info');
  };

  const handleClearGallery = () => {
    setSavedGallery([]);
    localStorage.removeItem('melodyforge_gallery');
    showToast('Gallery Cleared', 'All saved compositions removed', 'info');
  };

  const handlePlayGallerySong = async (song: GeneratedSong) => {
    setCurrentStep(5);
    setGeneratedNotes(song.notes);
    setGeneratedTokens(song.tokens);
    setGenerateConfig((prev) => ({
      ...prev,
      tempo: song.bpm,
      instrument: song.instrument,
      temperature: song.temperature,
    }));

    audioEngine.setInstrument(song.instrument);
    await audioEngine.playSequence(song.notes, song.bpm);
  };

  // Section 7: Quick Demo Mode (60 seconds)
  // Loads sample dataset → preprocesses → trains small model (10 epochs) → generates 100 notes → auto-plays them.
  const handleRunQuickDemo = async () => {
    if (isQuickDemoRunning) return;
    setIsQuickDemoRunning(true);

    // Audio unlocking MUST trigger from this user click
    await audioEngine.unlockAudio();
    setIsAudioUnlocked(true);

    setQuickDemoStepText('1/5: Loading 48 varied sample melodies...');
    showToast('Quick Demo Started', 'Step 1: Loading Classical, Jazz, Blues, and Folk dataset...', 'info');

    setCurrentStep(1);
    const samples = getFullSampleDataset();
    setMidiFiles(samples);
    await new Promise((r) => setTimeout(r, 600));

    setQuickDemoStepText('2/5: Extracting chords, durations, and sliding sequences...');
    setCurrentStep(2);
    const prepped = buildVocabularyAndSequences(
      samples.map((s) => s.tokens),
      { sequenceLength: 24, includeDuration: true, mergeAllTracks: false, vocabCap: 200, augmentTranspose: true },
      samples.reduce((acc, f) => acc + f.totalNotes, 0),
      samples.length
    );
    setPreprocessConfig({ sequenceLength: 24, includeDuration: true, mergeAllTracks: false, vocabCap: 200, augmentTranspose: true });
    await new Promise((r) => setTimeout(r, 600));

    setQuickDemoStepText('3/5: Compiling Fast LSTM network with glorotUniform...');
    setCurrentStep(3);
    const fastHyperparams: ModelHyperparams = {
      architecture: 'LSTM',
      layers: 1,
      units: 128,
      dropout: 0.1,
      embeddingDim: 64,
      denseUnits: 64,
    };
    setModelHyperparams(fastHyperparams);
    const built = buildMusicModel(prepped.vocab.length, 24, fastHyperparams, 0.005);
    setActiveModel(built.model);
    setLayersSummary(built.layersSummary);
    setTotalParams(built.totalParams);
    setIsModelCompiled(true);
    await new Promise((r) => setTimeout(r, 600));

    setQuickDemoStepText('4/5: Training for 10 GPU epochs on WebGL...');
    setCurrentStep(4);
    setTrainingHyperparams((prev) => ({ ...prev, epochs: 10, batchSize: 64, learningRate: 0.005 }));
    setIsTraining(true);

    await trainerRef.current.train(
      built.model,
      prepped.sequences,
      prepped.nextTokens,
      prepped.vocab.length,
      { epochs: 10, batchSize: 64, learningRate: 0.005, validationSplit: 0.1 },
      {
        onEpochEnd: (log, prog, eta) => {
          setTrainingLogs((prev) => [...prev, log]);
          setCurrentEpoch(log.epoch);
          setTrainingProgress(prog);
          setEtaSeconds(eta);
        },
        onLog: (msg) => {
          setTerminalMessages((prev) => [...prev.slice(-60), msg]);
        },
      }
    );

    setIsTraining(false);
    setHasTrainedModel(true);

    setQuickDemoStepText('5/5: Composing 100 notes with temperature 0.9 & playing audio...');
    setCurrentStep(5);

    const seed = prepped.sequences[0] || [0];
    const generated = await generateSequence(
      built.model,
      seed,
      24,
      100,
      0.9,
      prepped.vocab
    );

    setGeneratedTokens(generated);
    const notes = tokensToNoteEvents(generated, 120);
    setGeneratedNotes(notes);

    // Auto-play audible music immediately!
    try {
      audioEngine.setInstrument('piano');
      await audioEngine.playSequence(notes, 120);
    } catch (e) {
      console.warn('Auto-play after demo:', e);
    }

    setIsQuickDemoRunning(false);
    setQuickDemoStepText('');
    showToast(
      'Quick Demo Completed!',
      'Audible music is now playing through your speakers! You can adjust instruments, tempo, and temperature.',
      'success'
    );
  };

  // Keyboard shortcut: Spacebar to toggle Play/Pause on Step 5
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.code === 'Space' && currentStep === 5 && generatedNotes.length > 0) {
        e.preventDefault();
        const audioEngine = AudioEngine.getInstance();
        audioEngine.playSequence(generatedNotes, generateConfig.tempo);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, generatedNotes, generateConfig.tempo]);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#0B0F1A] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* About Modal & Audio Diagnostics */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

      {/* Sticky Top Navbar */}
      <Navbar
        currentStep={currentStep}
        onSelectStep={(step) => setCurrentStep(step)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onRunQuickDemo={handleRunQuickDemo}
        isQuickDemoRunning={isQuickDemoRunning}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        activeBackend={activeBackend}
        onTestSound={handleTestSound}
      />

      {/* Section 9.1: Enable Sound Banner if AudioContext is locked */}
      <EnableSoundBanner
        isUnlocked={isAudioUnlocked}
        onUnlock={async () => {
          await audioEngine.unlockAudio();
          setIsAudioUnlocked(true);
          showToast('Audio Unlocked', 'AudioContext is running and audible.', 'success');
        }}
      />

      {/* 5-Step Pipeline Stepper */}
      <Stepper
        steps={steps}
        currentStep={currentStep}
        onSelectStep={(stepId) => setCurrentStep(stepId)}
      />

      {/* Quick Demo Progress Overlay */}
      {isQuickDemoRunning && (
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 text-white px-4 py-2.5 text-center text-xs font-semibold shadow-lg animate-pulse flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>Quick Demo in progress: {quickDemoStepText}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12">
        {/* Hero Section */}
        <Hero
          onStartComposing={() => {
            setCurrentStep(1);
            window.scrollTo({ top: 400, behavior: 'smooth' });
          }}
          onRunQuickDemo={handleRunQuickDemo}
          isQuickDemoRunning={isQuickDemoRunning}
        />

        {/* Step 1: Collect MIDI Data */}
        {currentStep === 1 && (
          <DataStep
            midiFiles={midiFiles}
            onAddFiles={(newFiles) => setMidiFiles((prev) => [...prev, ...newFiles])}
            onRemoveFile={(id) => setMidiFiles((prev) => prev.filter((f) => f.id !== id))}
            onClearFiles={() => setMidiFiles([])}
            selectedGenres={selectedGenres}
            onToggleGenreTag={(g) =>
              setSelectedGenres((prev) =>
                prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
              )
            }
            onProceed={() => setCurrentStep(2)}
            onShowToast={showToast}
          />
        )}

        {/* Step 2: Preprocess Sequences (music21-style) */}
        {currentStep === 2 && (
          <PreprocessStep
            midiFiles={midiFiles}
            config={preprocessConfig}
            onChangeConfig={setPreprocessConfig}
            preprocessedData={preprocessedData}
            onProceed={() => {
              if (!isModelCompiled) {
                compileCurrentModel(true);
              }
              setCurrentStep(3);
            }}
            theme={theme}
          />
        )}

        {/* Step 3: Neural Model Architecture */}
        {currentStep === 3 && (
          <ModelStep
            hyperparams={modelHyperparams}
            onChangeHyperparams={setModelHyperparams}
            vocabSize={preprocessedData.vocab.length}
            sequenceLength={preprocessConfig.sequenceLength}
            layersSummary={layersSummary}
            totalParams={totalParams}
            isCompiled={isModelCompiled}
            onCompileModel={() => compileCurrentModel(false)}
            onProceed={() => setCurrentStep(4)}
          />
        )}

        {/* Step 4: Model Training on GPU */}
        {currentStep === 4 && (
          <TrainStep
            hyperparams={trainingHyperparams}
            onChangeHyperparams={setTrainingHyperparams}
            isTraining={isTraining}
            trainingProgress={trainingProgress}
            currentEpoch={currentEpoch}
            totalEpochs={trainingHyperparams.epochs}
            etaSeconds={etaSeconds}
            currentBatch={currentBatch}
            totalBatches={totalBatches}
            logs={trainingLogs}
            terminalMessages={terminalMessages}
            activeBackend={activeBackend}
            hasTrainedModel={hasTrainedModel}
            hasSavedModelInDb={hasSavedModelInDb}
            totalSequences={preprocessedData.totalSequences}
            onStartTraining={handleStartTraining}
            onStopTraining={handleStopTraining}
            onSaveToIndexedDb={handleSaveToIndexedDb}
            onLoadFromIndexedDb={handleLoadFromIndexedDb}
            onProceed={() => setCurrentStep(5)}
            onRunSelfTest={handleRunSelfTest}
          />
        )}

        {/* Step 5: Music Generation & Polyphonic Playback Studio */}
        {currentStep === 5 && (
          <GenerateStep
            config={generateConfig}
            onChangeConfig={setGenerateConfig}
            isGenerating={isGenerating}
            generationProgress={generationProgress}
            generatedTokens={generatedTokens}
            generatedNotes={generatedNotes}
            hasTrainedModel={hasTrainedModel}
            onGenerate={handleGenerateMusic}
            onGenerateRandomBaseline={handleGenerateRandomBaseline}
            onSaveToGallery={handleSaveToGallery}
            onShowToast={showToast}
            theme={theme}
            datasetGenre={midiFiles[0]?.genre || 'Classical / Jazz'}
            onTestSound={handleTestSound}
          />
        )}

        {/* Saved Compositions Gallery */}
        <section className="pt-8 border-t border-white/10">
          <Gallery
            songs={savedGallery}
            onPlaySong={handlePlayGallerySong}
            onDeleteSong={handleDeleteSong}
            onClearGallery={handleClearGallery}
            theme={theme}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/10 py-8 bg-slate-950/80 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-slate-300">MelodyForge AI</span>
            <span>•</span>
            <span>In-Browser Neural Music Generator (100% Client-Side)</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px] text-slate-400">
            <span>TensorFlow.js {tf.version.tfjs}</span>
            <span>•</span>
            <span>Tone.js Synthesizer</span>
            <span>•</span>
            <button
              onClick={() => setIsAboutOpen(true)}
              className="text-violet-400 hover:text-violet-300 underline"
            >
              Pipeline Guide & Audio Diagnostics
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
