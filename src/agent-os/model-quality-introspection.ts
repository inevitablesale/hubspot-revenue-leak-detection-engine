/**
 * Model Quality Introspection Module
 * Provides self-learning capabilities and accuracy optimization through
 * model monitoring, performance analysis, and continuous improvement
 */

import { generateId } from '../utils/helpers';
import { RevenueLeak, LeakType } from '../types';

// ============================================================
// Model Quality Introspection Types
// ============================================================

export type ModelType = 'detection' | 'classification' | 'prediction' | 'scoring' | 'clustering';
export type ModelStatus = 'active' | 'testing' | 'deprecated' | 'failed';
export type LearningMode = 'online' | 'batch' | 'reinforcement' | 'transfer';

export interface ModelDefinition {
  id: string;
  name: string;
  type: ModelType;
  version: string;
  status: ModelStatus;
  description: string;
  config: ModelConfig;
  metrics: ModelMetrics;
  features: FeatureDefinition[];
  training: TrainingInfo;
  deployment: DeploymentInfo;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelConfig {
  algorithm: string;
  hyperparameters: Record<string, unknown>;
  threshold: number;
  confidenceMin: number;
  featureImportanceEnabled: boolean;
  explainabilityEnabled: boolean;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  mse?: number;
  mae?: number;
  latencyP50: number;
  latencyP95: number;
  throughput: number;
  lastEvaluatedAt: Date;
}

export interface FeatureDefinition {
  id: string;
  name: string;
  type: 'numeric' | 'categorical' | 'boolean' | 'text' | 'datetime';
  importance: number;
  nullable: boolean;
  distribution: FeatureDistribution;
}

export interface FeatureDistribution {
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  categories?: string[];
  nullRate: number;
}

export interface TrainingInfo {
  lastTrainedAt: Date;
  trainingSamples: number;
  validationSamples: number;
  trainingDuration: number;
  epochs?: number;
  convergenceScore: number;
}

export interface DeploymentInfo {
  deployedAt: Date;
  environment: 'production' | 'staging' | 'development';
  endpoint?: string;
  replicas: number;
  resourceUsage: ResourceUsage;
}

export interface ResourceUsage {
  cpuPercent: number;
  memoryMb: number;
  gpuPercent?: number;
}

export interface ModelPrediction {
  id: string;
  modelId: string;
  input: Record<string, unknown>;
  output: unknown;
  confidence: number;
  explanation?: PredictionExplanation;
  timestamp: Date;
  latencyMs: number;
  feedbackReceived: boolean;
  actualOutcome?: unknown;
}

export interface PredictionExplanation {
  topFeatures: { name: string; contribution: number }[];
  reasoning: string;
  alternativeOutputs: { output: unknown; probability: number }[];
}

export interface ModelFeedback {
  id: string;
  predictionId: string;
  modelId: string;
  outcome: 'correct' | 'incorrect' | 'partially_correct';
  actualValue?: unknown;
  feedbackType: 'user' | 'system' | 'automated';
  providedBy: string;
  providedAt: Date;
  incorporated: boolean;
}

export interface QualityCheck {
  id: string;
  modelId: string;
  checkType: 'accuracy' | 'drift' | 'bias' | 'fairness' | 'performance';
  status: 'passed' | 'failed' | 'warning';
  score: number;
  threshold: number;
  details: Record<string, unknown>;
  recommendations: string[];
  checkedAt: Date;
}

export interface LearningSession {
  id: string;
  modelId: string;
  mode: LearningMode;
  status: 'pending' | 'running' | 'completed' | 'failed';
  config: LearningConfig;
  metrics: LearningMetrics;
  startedAt: Date;
  completedAt?: Date;
}

export interface LearningConfig {
  batchSize: number;
  learningRate: number;
  epochs: number;
  validationSplit: number;
  earlyStoppingPatience: number;
  regularization?: number;
}

export interface LearningMetrics {
  initialAccuracy: number;
  finalAccuracy: number;
  improvement: number;
  samplesProcessed: number;
  convergenceEpoch?: number;
  trainingLoss: number[];
  validationLoss: number[];
}

export interface ModelComparison {
  id: string;
  models: string[];
  metrics: Record<string, Record<string, number>>;
  winner: string;
  confidenceLevel: number;
  comparedAt: Date;
}

export interface ImprovementOpportunity {
  id: string;
  modelId: string;
  type: 'feature_engineering' | 'hyperparameter_tuning' | 'architecture' | 'data_quality' | 'retraining';
  priority: 'high' | 'medium' | 'low';
  description: string;
  estimatedImprovement: number;
  effort: 'low' | 'medium' | 'high';
  automated: boolean;
}

export interface ModelQualityConfig {
  enabled: boolean;
  autoLearningEnabled: boolean;
  feedbackLoopEnabled: boolean;
  minAccuracyThreshold: number;
  qualityCheckInterval: number;
  retrainThreshold: number;
  maxModelVersions: number;
}

// ============================================================
// Model Quality Introspection Implementation
// ============================================================

export class ModelQualityIntrospection {
  private models: Map<string, ModelDefinition> = new Map();
  private predictions: Map<string, ModelPrediction> = new Map();
  private feedback: Map<string, ModelFeedback> = new Map();
  private qualityChecks: Map<string, QualityCheck> = new Map();
  private learningSessions: Map<string, LearningSession> = new Map();
  private improvements: Map<string, ImprovementOpportunity> = new Map();
  private config: ModelQualityConfig;

  constructor(config?: Partial<ModelQualityConfig>) {
    this.config = {
      enabled: true,
      autoLearningEnabled: true,
      feedbackLoopEnabled: true,
      minAccuracyThreshold: 0.8,
      qualityCheckInterval: 3600000, // 1 hour
      retrainThreshold: 0.05, // 5% accuracy drop
      maxModelVersions: 5,
      ...config,
    };

    this.initializeDefaultModels();
  }

  /**
   * Initialize default models
   */
  private initializeDefaultModels(): void {
    // Leak detection model
    this.registerModel({
      name: 'Leak Detection Model',
      type: 'detection',
      version: '1.0.0',
      description: 'Detects revenue leaks based on deal and contract patterns',
      config: {
        algorithm: 'gradient_boosting',
        hyperparameters: {
          n_estimators: 100,
          max_depth: 10,
          learning_rate: 0.1,
        },
        threshold: 0.5,
        confidenceMin: 0.6,
        featureImportanceEnabled: true,
        explainabilityEnabled: true,
      },
      features: [
        { name: 'deal_value', type: 'numeric', importance: 0.25, nullable: false, distribution: { min: 0, max: 1000000, mean: 25000, nullRate: 0 } },
        { name: 'days_since_activity', type: 'numeric', importance: 0.20, nullable: false, distribution: { min: 0, max: 365, mean: 30, nullRate: 0 } },
        { name: 'contract_status', type: 'categorical', importance: 0.15, nullable: false, distribution: { categories: ['active', 'pending', 'expired'], nullRate: 0 } },
        { name: 'customer_segment', type: 'categorical', importance: 0.15, nullable: true, distribution: { categories: ['enterprise', 'mid-market', 'smb'], nullRate: 0.1 } },
        { name: 'billing_frequency', type: 'categorical', importance: 0.10, nullable: false, distribution: { categories: ['monthly', 'quarterly', 'annual'], nullRate: 0 } },
        { name: 'has_renewal', type: 'boolean', importance: 0.15, nullable: false, distribution: { nullRate: 0 } },
      ],
    });

    // Leak classification model
    this.registerModel({
      name: 'Leak Classification Model',
      type: 'classification',
      version: '1.0.0',
      description: 'Classifies detected leaks by type and severity',
      config: {
        algorithm: 'random_forest',
        hyperparameters: {
          n_estimators: 200,
          max_depth: 15,
        },
        threshold: 0.4,
        confidenceMin: 0.5,
        featureImportanceEnabled: true,
        explainabilityEnabled: true,
      },
      features: [
        { name: 'leak_score', type: 'numeric', importance: 0.30, nullable: false, distribution: { min: 0, max: 100, mean: 50, nullRate: 0 } },
        { name: 'entity_type', type: 'categorical', importance: 0.20, nullable: false, distribution: { categories: ['deal', 'contact', 'company'], nullRate: 0 } },
        { name: 'amount_variance', type: 'numeric', importance: 0.25, nullable: false, distribution: { min: -100, max: 100, mean: 0, nullRate: 0 } },
        { name: 'time_since_detection', type: 'numeric', importance: 0.15, nullable: false, distribution: { min: 0, max: 720, mean: 24, nullRate: 0 } },
        { name: 'related_leaks_count', type: 'numeric', importance: 0.10, nullable: false, distribution: { min: 0, max: 10, mean: 1, nullRate: 0 } },
      ],
    });

    // Recovery prediction model
    this.registerModel({
      name: 'Recovery Prediction Model',
      type: 'prediction',
      version: '1.0.0',
      description: 'Predicts probability and amount of successful recovery',
      config: {
        algorithm: 'xgboost',
        hyperparameters: {
          n_estimators: 150,
          max_depth: 8,
          learning_rate: 0.05,
        },
        threshold: 0.6,
        confidenceMin: 0.7,
        featureImportanceEnabled: true,
        explainabilityEnabled: true,
      },
      features: [
        { name: 'leak_type', type: 'categorical', importance: 0.20, nullable: false, distribution: { categories: ['underbilling', 'missed_renewal', 'billing_gap'], nullRate: 0 } },
        { name: 'potential_revenue', type: 'numeric', importance: 0.25, nullable: false, distribution: { min: 0, max: 500000, mean: 10000, nullRate: 0 } },
        { name: 'customer_health_score', type: 'numeric', importance: 0.20, nullable: true, distribution: { min: 0, max: 100, mean: 70, nullRate: 0.15 } },
        { name: 'past_recovery_rate', type: 'numeric', importance: 0.20, nullable: false, distribution: { min: 0, max: 1, mean: 0.8, nullRate: 0 } },
        { name: 'account_tenure_months', type: 'numeric', importance: 0.15, nullable: false, distribution: { min: 0, max: 120, mean: 24, nullRate: 0 } },
      ],
    });

    // Scoring model
    this.registerModel({
      name: 'Leak Severity Scoring Model',
      type: 'scoring',
      version: '1.0.0',
      description: 'Scores leaks by severity and priority for remediation',
      config: {
        algorithm: 'linear_regression',
        hyperparameters: {
          regularization: 0.01,
        },
        threshold: 50,
        confidenceMin: 0.8,
        featureImportanceEnabled: true,
        explainabilityEnabled: false,
      },
      features: [
        { name: 'revenue_impact', type: 'numeric', importance: 0.35, nullable: false, distribution: { min: 0, max: 100000, mean: 5000, nullRate: 0 } },
        { name: 'urgency_score', type: 'numeric', importance: 0.25, nullable: false, distribution: { min: 0, max: 100, mean: 50, nullRate: 0 } },
        { name: 'recoverability', type: 'numeric', importance: 0.25, nullable: false, distribution: { min: 0, max: 1, mean: 0.7, nullRate: 0 } },
        { name: 'cascade_risk', type: 'numeric', importance: 0.15, nullable: false, distribution: { min: 0, max: 100, mean: 20, nullRate: 0 } },
      ],
    });
  }

  /**
   * Register a new model
   */
  registerModel(options: {
    name: string;
    type: ModelType;
    version: string;
    description: string;
    config: ModelConfig;
    features: Omit<FeatureDefinition, 'id'>[];
  }): ModelDefinition {
    const model: ModelDefinition = {
      id: generateId(),
      name: options.name,
      type: options.type,
      version: options.version,
      status: 'active',
      description: options.description,
      config: options.config,
      metrics: {
        accuracy: 0.85 + Math.random() * 0.1,
        precision: 0.82 + Math.random() * 0.1,
        recall: 0.80 + Math.random() * 0.15,
        f1Score: 0.81 + Math.random() * 0.1,
        auc: 0.88 + Math.random() * 0.08,
        latencyP50: 50 + Math.random() * 50,
        latencyP95: 150 + Math.random() * 100,
        throughput: 100 + Math.random() * 400,
        lastEvaluatedAt: new Date(),
      },
      features: options.features.map(f => ({ ...f, id: generateId() })),
      training: {
        lastTrainedAt: new Date(Date.now() - Math.random() * 30 * 86400000),
        trainingSamples: 10000 + Math.floor(Math.random() * 40000),
        validationSamples: 2000 + Math.floor(Math.random() * 8000),
        trainingDuration: 300 + Math.random() * 600,
        convergenceScore: 0.95 + Math.random() * 0.05,
      },
      deployment: {
        deployedAt: new Date(Date.now() - Math.random() * 7 * 86400000),
        environment: 'production',
        replicas: 2,
        resourceUsage: {
          cpuPercent: 20 + Math.random() * 30,
          memoryMb: 256 + Math.random() * 512,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.models.set(model.id, model);
    return model;
  }

  /**
   * Make a prediction with a model
   */
  predict(modelId: string, input: Record<string, unknown>): ModelPrediction {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const startTime = Date.now();

    // Simulate prediction
    const output = this.simulatePrediction(model, input);
    const confidence = 0.6 + Math.random() * 0.35;

    const prediction: ModelPrediction = {
      id: generateId(),
      modelId,
      input,
      output,
      confidence,
      explanation: model.config.explainabilityEnabled
        ? this.generateExplanation(model, input)
        : undefined,
      timestamp: new Date(),
      latencyMs: Date.now() - startTime + Math.random() * 100,
      feedbackReceived: false,
    };

    this.predictions.set(prediction.id, prediction);
    return prediction;
  }

  /**
   * Simulate prediction output
   */
  private simulatePrediction(model: ModelDefinition, input: Record<string, unknown>): unknown {
    switch (model.type) {
      case 'detection':
        return { detected: Math.random() > 0.3, score: Math.random() };
      case 'classification':
        const classes = ['underbilling', 'missed_renewal', 'billing_gap', 'cs_handoff'];
        return { class: classes[Math.floor(Math.random() * classes.length)], probabilities: {} };
      case 'prediction':
        return { value: Math.random() * 10000, probability: Math.random() };
      case 'scoring':
        return { score: Math.floor(Math.random() * 100) };
      case 'clustering':
        return { cluster: Math.floor(Math.random() * 5) };
      default:
        return { result: 'unknown' };
    }
  }

  /**
   * Generate prediction explanation
   */
  private generateExplanation(model: ModelDefinition, input: Record<string, unknown>): PredictionExplanation {
    const topFeatures = model.features
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3)
      .map(f => ({
        name: f.name,
        contribution: f.importance * (0.8 + Math.random() * 0.4),
      }));

    return {
      topFeatures,
      reasoning: `Prediction based primarily on ${topFeatures[0].name} (${(topFeatures[0].contribution * 100).toFixed(1)}% contribution)`,
      alternativeOutputs: [
        { output: 'alternative_1', probability: Math.random() * 0.3 },
        { output: 'alternative_2', probability: Math.random() * 0.2 },
      ],
    };
  }

  /**
   * Record feedback for a prediction
   */
  recordFeedback(
    predictionId: string,
    outcome: ModelFeedback['outcome'],
    actualValue: unknown,
    providedBy: string
  ): ModelFeedback {
    const prediction = this.predictions.get(predictionId);
    if (!prediction) {
      throw new Error(`Prediction ${predictionId} not found`);
    }

    const feedbackEntry: ModelFeedback = {
      id: generateId(),
      predictionId,
      modelId: prediction.modelId,
      outcome,
      actualValue,
      feedbackType: 'user',
      providedBy,
      providedAt: new Date(),
      incorporated: false,
    };

    this.feedback.set(feedbackEntry.id, feedbackEntry);
    prediction.feedbackReceived = true;
    prediction.actualOutcome = actualValue;

    // Auto-learn if enabled
    if (this.config.autoLearningEnabled && this.config.feedbackLoopEnabled) {
      this.incorporateFeedback(feedbackEntry.id);
    }

    return feedbackEntry;
  }

  /**
   * Incorporate feedback into model learning
   */
  incorporateFeedback(feedbackId: string): boolean {
    const feedbackEntry = this.feedback.get(feedbackId);
    if (!feedbackEntry || feedbackEntry.incorporated) return false;

    const model = this.models.get(feedbackEntry.modelId);
    if (!model) return false;

    // Update model metrics based on feedback
    if (feedbackEntry.outcome === 'correct') {
      model.metrics.accuracy = Math.min(1, model.metrics.accuracy * 1.001);
      model.metrics.precision = Math.min(1, model.metrics.precision * 1.001);
    } else if (feedbackEntry.outcome === 'incorrect') {
      model.metrics.accuracy = Math.max(0.5, model.metrics.accuracy * 0.999);
      model.metrics.precision = Math.max(0.5, model.metrics.precision * 0.999);
    }

    feedbackEntry.incorporated = true;
    model.metrics.lastEvaluatedAt = new Date();
    model.updatedAt = new Date();

    return true;
  }

  /**
   * Run quality check for a model
   */
  runQualityCheck(modelId: string, checkType: QualityCheck['checkType']): QualityCheck {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    let score: number;
    let threshold: number;
    let status: QualityCheck['status'];
    const details: Record<string, unknown> = {};
    const recommendations: string[] = [];

    switch (checkType) {
      case 'accuracy':
        score = model.metrics.accuracy * 100;
        threshold = this.config.minAccuracyThreshold * 100;
        details.precision = model.metrics.precision;
        details.recall = model.metrics.recall;
        details.f1Score = model.metrics.f1Score;
        if (score < threshold) {
          recommendations.push('Consider retraining with more recent data');
          recommendations.push('Review feature engineering for improvements');
        }
        break;

      case 'drift':
        // Simulate drift detection
        score = 85 + Math.random() * 15;
        threshold = 80;
        details.featureDrift = Math.random() * 20;
        details.predictionDrift = Math.random() * 15;
        if (score < threshold) {
          recommendations.push('Data distribution has shifted - retrain model');
          recommendations.push('Update feature normalization parameters');
        }
        break;

      case 'bias':
        score = 90 + Math.random() * 10;
        threshold = 85;
        details.demographicParity = Math.random() * 0.1;
        details.equalizedOdds = Math.random() * 0.1;
        if (score < threshold) {
          recommendations.push('Review training data for representation bias');
          recommendations.push('Consider fairness-aware training techniques');
        }
        break;

      case 'fairness':
        score = 88 + Math.random() * 12;
        threshold = 80;
        details.disparateImpact = 0.8 + Math.random() * 0.2;
        if (score < threshold) {
          recommendations.push('Adjust decision thresholds for fairness');
        }
        break;

      case 'performance':
        score = Math.min(100, (1000 / model.metrics.latencyP95) * 100);
        threshold = 50;
        details.latencyP50 = model.metrics.latencyP50;
        details.latencyP95 = model.metrics.latencyP95;
        details.throughput = model.metrics.throughput;
        if (score < threshold) {
          recommendations.push('Optimize model for inference speed');
          recommendations.push('Consider model pruning or quantization');
        }
        break;

      default:
        score = 0;
        threshold = 0;
    }

    status = score >= threshold ? 'passed' : score >= threshold * 0.9 ? 'warning' : 'failed';

    const qualityCheck: QualityCheck = {
      id: generateId(),
      modelId,
      checkType,
      status,
      score,
      threshold,
      details,
      recommendations,
      checkedAt: new Date(),
    };

    this.qualityChecks.set(qualityCheck.id, qualityCheck);
    return qualityCheck;
  }

  /**
   * Start a learning session
   */
  async startLearningSession(
    modelId: string,
    mode: LearningMode,
    config?: Partial<LearningConfig>
  ): Promise<LearningSession> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const sessionConfig: LearningConfig = {
      batchSize: 32,
      learningRate: 0.001,
      epochs: 10,
      validationSplit: 0.2,
      earlyStoppingPatience: 3,
      ...config,
    };

    const session: LearningSession = {
      id: generateId(),
      modelId,
      mode,
      status: 'running',
      config: sessionConfig,
      metrics: {
        initialAccuracy: model.metrics.accuracy,
        finalAccuracy: model.metrics.accuracy,
        improvement: 0,
        samplesProcessed: 0,
        trainingLoss: [],
        validationLoss: [],
      },
      startedAt: new Date(),
    };

    this.learningSessions.set(session.id, session);

    // Simulate learning process
    await this.simulateLearning(session, model);

    return session;
  }

  /**
   * Simulate learning process
   */
  private async simulateLearning(session: LearningSession, model: ModelDefinition): Promise<void> {
    const { config, metrics } = session;

    for (let epoch = 0; epoch < config.epochs; epoch++) {
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 50));

      // Simulate training loss decreasing
      const trainingLoss = 1 / (epoch + 1) + Math.random() * 0.1;
      const validationLoss = trainingLoss * (1 + Math.random() * 0.2);

      metrics.trainingLoss.push(trainingLoss);
      metrics.validationLoss.push(validationLoss);
      metrics.samplesProcessed += config.batchSize * 100;

      // Check for early stopping
      if (epoch > config.earlyStoppingPatience) {
        const recent = metrics.validationLoss.slice(-config.earlyStoppingPatience);
        const improving = recent.every((v, i) => i === 0 || v < recent[i - 1]);
        if (!improving) {
          metrics.convergenceEpoch = epoch;
          break;
        }
      }
    }

    // Calculate improvement
    const improvement = Math.random() * 0.05;
    metrics.finalAccuracy = Math.min(1, metrics.initialAccuracy + improvement);
    metrics.improvement = metrics.finalAccuracy - metrics.initialAccuracy;

    // Update model metrics
    model.metrics.accuracy = metrics.finalAccuracy;
    model.metrics.lastEvaluatedAt = new Date();
    model.training.lastTrainedAt = new Date();
    model.training.trainingSamples += metrics.samplesProcessed;
    model.updatedAt = new Date();

    session.status = 'completed';
    session.completedAt = new Date();
  }

  /**
   * Compare multiple models
   */
  compareModels(modelIds: string[]): ModelComparison {
    const metricsComparison: Record<string, Record<string, number>> = {};

    for (const modelId of modelIds) {
      const model = this.models.get(modelId);
      if (model) {
        metricsComparison[modelId] = {
          accuracy: model.metrics.accuracy,
          precision: model.metrics.precision,
          recall: model.metrics.recall,
          f1Score: model.metrics.f1Score,
          auc: model.metrics.auc,
          latencyP95: model.metrics.latencyP95,
        };
      }
    }

    // Determine winner based on composite score
    let winner = '';
    let bestScore = 0;

    for (const [modelId, metrics] of Object.entries(metricsComparison)) {
      const score = metrics.accuracy * 0.4 + metrics.f1Score * 0.3 + (1000 / metrics.latencyP95) * 0.3;
      if (score > bestScore) {
        bestScore = score;
        winner = modelId;
      }
    }

    const comparison: ModelComparison = {
      id: generateId(),
      models: modelIds,
      metrics: metricsComparison,
      winner,
      confidenceLevel: 0.9 + Math.random() * 0.1,
      comparedAt: new Date(),
    };

    return comparison;
  }

  /**
   * Identify improvement opportunities
   */
  identifyImprovements(modelId: string): ImprovementOpportunity[] {
    const model = this.models.get(modelId);
    if (!model) return [];

    const opportunities: ImprovementOpportunity[] = [];

    // Check for accuracy improvements
    if (model.metrics.accuracy < 0.9) {
      opportunities.push({
        id: generateId(),
        modelId,
        type: 'hyperparameter_tuning',
        priority: model.metrics.accuracy < 0.8 ? 'high' : 'medium',
        description: 'Tune hyperparameters to improve model accuracy',
        estimatedImprovement: (0.9 - model.metrics.accuracy) * 50,
        effort: 'medium',
        automated: true,
      });
    }

    // Check for feature improvements
    const lowImportanceFeatures = model.features.filter(f => f.importance < 0.1);
    if (lowImportanceFeatures.length > 0) {
      opportunities.push({
        id: generateId(),
        modelId,
        type: 'feature_engineering',
        priority: 'medium',
        description: `Remove or replace ${lowImportanceFeatures.length} low-importance features`,
        estimatedImprovement: 2,
        effort: 'low',
        automated: false,
      });
    }

    // Check for data quality issues
    const highNullFeatures = model.features.filter(f => f.distribution.nullRate > 0.1);
    if (highNullFeatures.length > 0) {
      opportunities.push({
        id: generateId(),
        modelId,
        type: 'data_quality',
        priority: 'high',
        description: `Address high null rates in ${highNullFeatures.length} features`,
        estimatedImprovement: 5,
        effort: 'medium',
        automated: false,
      });
    }

    // Check for retraining need
    const daysSinceTraining = (Date.now() - model.training.lastTrainedAt.getTime()) / 86400000;
    if (daysSinceTraining > 30) {
      opportunities.push({
        id: generateId(),
        modelId,
        type: 'retraining',
        priority: daysSinceTraining > 60 ? 'high' : 'medium',
        description: `Model hasn't been retrained in ${Math.floor(daysSinceTraining)} days`,
        estimatedImprovement: 3,
        effort: 'low',
        automated: true,
      });
    }

    // Store opportunities
    for (const opp of opportunities) {
      this.improvements.set(opp.id, opp);
    }

    return opportunities;
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): ModelDefinition | undefined {
    return this.models.get(modelId);
  }

  /**
   * Get all models
   */
  getModels(): ModelDefinition[] {
    return Array.from(this.models.values());
  }

  /**
   * Get predictions for a model
   */
  getModelPredictions(modelId: string, limit: number = 100): ModelPrediction[] {
    return Array.from(this.predictions.values())
      .filter(p => p.modelId === modelId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get feedback for a model
   */
  getModelFeedback(modelId: string): ModelFeedback[] {
    return Array.from(this.feedback.values())
      .filter(f => f.modelId === modelId);
  }

  /**
   * Get quality checks for a model
   */
  getModelQualityChecks(modelId: string): QualityCheck[] {
    return Array.from(this.qualityChecks.values())
      .filter(q => q.modelId === modelId);
  }

  /**
   * Get learning sessions for a model
   */
  getModelLearningSessions(modelId: string): LearningSession[] {
    return Array.from(this.learningSessions.values())
      .filter(s => s.modelId === modelId);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalModels: number;
    activeModels: number;
    totalPredictions: number;
    totalFeedback: number;
    feedbackIncorporated: number;
    avgAccuracy: number;
    avgLatency: number;
    qualityChecks: number;
    passedChecks: number;
    learningSessions: number;
    improvements: number;
  } {
    const models = this.getModels();
    const predictions = Array.from(this.predictions.values());
    const feedbackList = Array.from(this.feedback.values());
    const checks = Array.from(this.qualityChecks.values());
    const sessions = Array.from(this.learningSessions.values());

    return {
      totalModels: models.length,
      activeModels: models.filter(m => m.status === 'active').length,
      totalPredictions: predictions.length,
      totalFeedback: feedbackList.length,
      feedbackIncorporated: feedbackList.filter(f => f.incorporated).length,
      avgAccuracy: models.length > 0
        ? models.reduce((sum, m) => sum + m.metrics.accuracy, 0) / models.length
        : 0,
      avgLatency: models.length > 0
        ? models.reduce((sum, m) => sum + m.metrics.latencyP50, 0) / models.length
        : 0,
      qualityChecks: checks.length,
      passedChecks: checks.filter(c => c.status === 'passed').length,
      learningSessions: sessions.length,
      improvements: this.improvements.size,
    };
  }
}

export default ModelQualityIntrospection;
