/**
 * MelodyForge – Neural Network Architecture Builder (Section B)
 * Sequential LSTM/GRU network with Embedding, Dense(128, 'relu'), Dense(vocabSize, 'softmax')
 * and sparseCategoricalCrossentropy loss.
 */
import * as tf from '@tensorflow/tfjs';
import { ModelHyperparams } from '../types';

export interface LayerSummaryItem {
  id: number;
  name: string;
  type: string;
  outputShape: string;
  paramCount: number;
  activation?: string;
}

export interface ModelBuildResult {
  model: tf.Sequential;
  layersSummary: LayerSummaryItem[];
  totalParams: number;
  trainableParams: number;
}

/**
 * Validates that all sequence tokens and target tokens are in the valid range [0, vocabSize - 1].
 */
export function validateTokenIndicesRange(
  xsData: number[][],
  ysData: number[],
  vocabSize: number
): void {
  for (let i = 0; i < xsData.length; i++) {
    const row = xsData[i];
    for (let j = 0; j < row.length; j++) {
      const idx = row[j];
      if (idx < 0 || idx >= vocabSize) {
        console.error(
          `Vocabulary mismatch: offending token index ${idx} at sample ${i}, pos ${j} (vocab size: ${vocabSize})`
        );
        throw new Error(
          `Vocabulary mismatch: token index out of range (offending index: ${idx}, vocab size: ${vocabSize})`
        );
      }
    }
  }

  for (let i = 0; i < ysData.length; i++) {
    const idx = ysData[i];
    if (idx < 0 || idx >= vocabSize) {
      console.error(
        `Vocabulary mismatch: offending target token index ${idx} at sample ${i} (vocab size: ${vocabSize})`
      );
      throw new Error(
        `Vocabulary mismatch: token index out of range (offending target index: ${idx}, vocab size: ${vocabSize})`
      );
    }
  }
}

export function buildMusicModel(
  vocabSize: number,
  sequenceLength: number,
  hyperparams: ModelHyperparams,
  learningRate = 0.005,
  existingModel?: tf.LayersModel | null
): ModelBuildResult {
  // Dispose old model if provided to prevent memory leaks
  if (existingModel) {
    try {
      existingModel.dispose();
    } catch {
      // ignore
    }
  }

  const model = tf.sequential();

  // 1. Embedding Layer: Maps discrete token index -> dense vector
  model.add(
    tf.layers.embedding({
      inputDim: vocabSize, // Must equal vocabulary.length INCLUDING <UNK>
      outputDim: hyperparams.embeddingDim || 64,
      inputLength: sequenceLength,
      name: 'note_embedding',
    })
  );

  // 2. Recurrent Layers (LSTM or GRU)
  const numLayers = Math.max(1, Math.min(3, hyperparams.layers));
  const units = hyperparams.units || 128;

  for (let i = 0; i < numLayers; i++) {
    const isLastRecurrent = i === numLayers - 1;
    const layerName = `${hyperparams.architecture.toLowerCase()}_layer_${i + 1}`;

    if (hyperparams.architecture === 'LSTM') {
      model.add(
        tf.layers.lstm({
          units,
          returnSequences: !isLastRecurrent,
          name: layerName,
          recurrentInitializer: 'glorotUniform',
        })
      );
    } else {
      model.add(
        tf.layers.gru({
          units,
          returnSequences: !isLastRecurrent,
          name: layerName,
          recurrentInitializer: 'glorotUniform',
        })
      );
    }
  }

  // 3. Dropout regularization
  const dropoutRate = hyperparams.dropout ?? 0.2;
  if (dropoutRate > 0) {
    model.add(tf.layers.dropout({ rate: dropoutRate, name: 'dropout' }));
  }

  // 4. Dense feature extraction layer (ReLU)
  model.add(
    tf.layers.dense({
      units: 128,
      activation: 'relu',
      name: 'dense_feature_extractor',
    })
  );

  // 5. Output softmax classification head over full vocabulary
  model.add(
    tf.layers.dense({
      units: vocabSize,
      activation: 'softmax',
      name: 'output_vocabulary_softmax',
    })
  );

  // Compile with Adam (clamped between 0.0005 and 0.01) and sparseCategoricalCrossentropy
  const clampedLr = Math.max(0.0005, Math.min(0.01, learningRate));
  model.compile({
    optimizer: tf.train.adam(clampedLr),
    loss: 'sparseCategoricalCrossentropy',
    metrics: ['accuracy'],
  });

  // Extract layer summaries safely
  let totalParams = 0;
  const layersSummary: LayerSummaryItem[] = model.layers.map((layer, index) => {
    let paramCount = 0;
    try {
      for (const weight of layer.getWeights()) {
        paramCount += weight.size;
      }
    } catch {
      paramCount = 0;
    }
    totalParams += paramCount;

    let shapeStr = 'unknown';
    try {
      shapeStr = JSON.stringify(layer.outputShape);
    } catch {
      shapeStr = `[-1, ${layer.name.includes('dense') ? vocabSize : units}]`;
    }

    return {
      id: index,
      name: layer.name,
      type: layer.getClassName(),
      outputShape: shapeStr,
      paramCount,
      activation: (layer as unknown as { activation?: { name?: string } }).activation?.name,
    };
  });

  return {
    model,
    layersSummary,
    totalParams,
    trainableParams: totalParams,
  };
}
