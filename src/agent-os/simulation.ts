/**
 * Simulation Module
 * What-if scenario modeling and predictive analysis
 */

import { RevenueLeak, LeakType, LeakSeverity } from '../types';
import { generateId } from '../utils/helpers';
import {
  Simulation,
  SimulationParameter,
  SimulationResult,
  SimulationOutcome,
  Distribution,
  SimulationConfig,
} from './types';

export interface ScenarioDefinition {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    change: number | string;
  }>;
}

export interface MonteCarloConfig {
  iterations: number;
  confidenceLevel: number;
  seed?: number;
}

export interface SensitivityResult {
  parameter: string;
  baselineValue: number;
  sensitivityScore: number;
  impactRange: { min: number; max: number };
  recommendations: string[];
}

export class SimulationEngine {
  private simulations: Map<string, Simulation> = new Map();
  private results: Map<string, SimulationResult> = new Map();
  private config: SimulationConfig;

  constructor(config?: Partial<SimulationConfig>) {
    this.config = {
      enabled: true,
      defaultIterations: 1000,
      maxSimulationsPerDay: 50,
      cacheResultsHours: 24,
      ...config,
    };
  }

  /**
   * Create a what-if simulation
   */
  createWhatIfSimulation(
    name: string,
    leaks: RevenueLeak[],
    scenario: ScenarioDefinition
  ): Simulation {
    const parameters: SimulationParameter[] = [];

    // Build parameters from current leak data and scenario
    for (const param of scenario.parameters) {
      const currentValue = this.getCurrentValue(leaks, param.name);
      const simulatedValue = this.applyChange(currentValue, param.change);

      parameters.push({
        name: param.name,
        description: `${param.name} adjusted by ${param.change}`,
        type: typeof currentValue === 'number' ? 'number' : 'choice',
        currentValue,
        simulatedValue,
      });
    }

    const simulation: Simulation = {
      id: generateId(),
      name,
      description: scenario.description,
      type: 'what_if',
      status: 'draft',
      parameters,
      createdAt: new Date(),
    };

    this.simulations.set(simulation.id, simulation);
    return simulation;
  }

  /**
   * Create a Monte Carlo simulation
   */
  createMonteCarloSimulation(
    name: string,
    leaks: RevenueLeak[],
    config: MonteCarloConfig
  ): Simulation {
    const parameters: SimulationParameter[] = [
      {
        name: 'recovery_rate',
        description: 'Probability of successful leak recovery',
        type: 'percentage',
        currentValue: 0.65,
        simulatedValue: 0.65,
        range: { min: 0.4, max: 0.9 },
      },
      {
        name: 'time_to_recover',
        description: 'Average days to recover a leak',
        type: 'number',
        currentValue: 14,
        simulatedValue: 14,
        range: { min: 7, max: 30 },
      },
      {
        name: 'revenue_variance',
        description: 'Variance in actual recovered revenue',
        type: 'percentage',
        currentValue: 0.2,
        simulatedValue: 0.2,
        range: { min: 0.1, max: 0.5 },
      },
    ];

    const simulation: Simulation = {
      id: generateId(),
      name,
      description: `Monte Carlo simulation with ${config.iterations} iterations`,
      type: 'monte_carlo',
      status: 'draft',
      parameters,
      createdAt: new Date(),
    };

    this.simulations.set(simulation.id, simulation);
    return simulation;
  }

  /**
   * Run a simulation
   */
  async runSimulation(simulationId: string, leaks: RevenueLeak[]): Promise<SimulationResult> {
    const simulation = this.simulations.get(simulationId);
    if (!simulation) {
      throw new Error(`Simulation ${simulationId} not found`);
    }

    if (!this.config.enabled) {
      throw new Error('Simulation engine is disabled');
    }

    simulation.status = 'running';
    const startTime = Date.now();

    let result: SimulationResult;

    switch (simulation.type) {
      case 'what_if':
        result = await this.runWhatIfSimulation(simulation, leaks);
        break;
      case 'monte_carlo':
        result = await this.runMonteCarloSimulation(simulation, leaks);
        break;
      case 'scenario_planning':
        result = await this.runScenarioPlanningSimulation(simulation, leaks);
        break;
      case 'sensitivity':
        result = await this.runSensitivityAnalysis(simulation, leaks);
        break;
      default:
        throw new Error(`Unknown simulation type: ${simulation.type}`);
    }

    result.executionTime = Date.now() - startTime;
    simulation.status = 'completed';
    simulation.executedAt = new Date();
    simulation.results = result;

    this.results.set(result.id, result);
    return result;
  }

  /**
   * Run what-if simulation
   */
  private async runWhatIfSimulation(
    simulation: Simulation,
    leaks: RevenueLeak[]
  ): Promise<SimulationResult> {
    const outcomes: SimulationOutcome[] = [];

    // Calculate baseline metrics
    const baselineTotalRevenue = leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
    const baselineLeakCount = leaks.length;
    const baselineRecoveryRate = 0.65; // Default assumption

    // Apply parameter changes and calculate impacts
    for (const param of simulation.parameters) {
      let outcome: SimulationOutcome;

      switch (param.name) {
        case 'detection_threshold':
          const thresholdChange = Number(param.simulatedValue) / Number(param.currentValue);
          const simulatedLeakCount = Math.round(baselineLeakCount * (2 - thresholdChange));
          outcome = {
            metric: 'detected_leaks',
            baselineValue: baselineLeakCount,
            simulatedValue: simulatedLeakCount,
            change: simulatedLeakCount - baselineLeakCount,
            changePercent: ((simulatedLeakCount - baselineLeakCount) / baselineLeakCount) * 100,
            confidence: 0.75,
          };
          break;

        case 'recovery_rate':
          const newRecoveryRate = Number(param.simulatedValue);
          const simulatedRecoveredRevenue = baselineTotalRevenue * newRecoveryRate;
          const baselineRecoveredRevenue = baselineTotalRevenue * baselineRecoveryRate;
          outcome = {
            metric: 'recovered_revenue',
            baselineValue: baselineRecoveredRevenue,
            simulatedValue: simulatedRecoveredRevenue,
            change: simulatedRecoveredRevenue - baselineRecoveredRevenue,
            changePercent: ((simulatedRecoveredRevenue - baselineRecoveredRevenue) / baselineRecoveredRevenue) * 100,
            confidence: 0.8,
          };
          break;

        case 'prevention_effectiveness':
          const preventionRate = Number(param.simulatedValue);
          const simulatedPreventedRevenue = baselineTotalRevenue * preventionRate;
          outcome = {
            metric: 'prevented_revenue_loss',
            baselineValue: 0,
            simulatedValue: simulatedPreventedRevenue,
            change: simulatedPreventedRevenue,
            changePercent: 100,
            confidence: 0.7,
          };
          break;

        default:
          // Generic parameter impact
          const currentVal = Number(param.currentValue) || 0;
          const simVal = Number(param.simulatedValue) || 0;
          outcome = {
            metric: param.name,
            baselineValue: currentVal,
            simulatedValue: simVal,
            change: simVal - currentVal,
            changePercent: currentVal ? ((simVal - currentVal) / currentVal) * 100 : 0,
            confidence: 0.6,
          };
      }

      outcomes.push(outcome);
    }

    return {
      id: generateId(),
      simulationId: simulation.id,
      outcomes,
      confidence: this.calculateOverallConfidence(outcomes),
      executionTime: 0,
    };
  }

  /**
   * Run Monte Carlo simulation
   */
  private async runMonteCarloSimulation(
    simulation: Simulation,
    leaks: RevenueLeak[]
  ): Promise<SimulationResult> {
    const iterations = this.config.defaultIterations;
    const results: number[] = [];

    const baselineRevenue = leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);

    // Get parameter ranges
    const recoveryRateParam = simulation.parameters.find(p => p.name === 'recovery_rate');
    const revenueVarianceParam = simulation.parameters.find(p => p.name === 'revenue_variance');

    const recoveryRange = recoveryRateParam?.range || { min: 0.4, max: 0.9 };
    const varianceRange = revenueVarianceParam?.range || { min: 0.1, max: 0.5 };

    // Run iterations
    for (let i = 0; i < iterations; i++) {
      // Random recovery rate within range
      const recoveryRate = recoveryRange.min + Math.random() * (recoveryRange.max - recoveryRange.min);
      
      // Random variance
      const variance = varianceRange.min + Math.random() * (varianceRange.max - varianceRange.min);
      
      // Calculate simulated recovered revenue with variance
      const baseRecovered = baselineRevenue * recoveryRate;
      const varianceAdjustment = 1 + (Math.random() - 0.5) * 2 * variance;
      const simulatedRecovered = baseRecovered * varianceAdjustment;
      
      results.push(simulatedRecovered);
    }

    // Calculate statistics
    const sortedResults = [...results].sort((a, b) => a - b);
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const median = sortedResults[Math.floor(results.length / 2)];
    const variance = results.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / results.length;
    const stdDev = Math.sqrt(variance);

    const distribution: Distribution = {
      mean,
      median,
      standardDeviation: stdDev,
      percentiles: {
        5: sortedResults[Math.floor(results.length * 0.05)],
        25: sortedResults[Math.floor(results.length * 0.25)],
        50: median,
        75: sortedResults[Math.floor(results.length * 0.75)],
        95: sortedResults[Math.floor(results.length * 0.95)],
      },
    };

    const outcomes: SimulationOutcome[] = [
      {
        metric: 'recovered_revenue',
        baselineValue: baselineRevenue * 0.65,
        simulatedValue: mean,
        change: mean - baselineRevenue * 0.65,
        changePercent: ((mean - baselineRevenue * 0.65) / (baselineRevenue * 0.65)) * 100,
        confidence: 0.85,
        distribution,
      },
    ];

    return {
      id: generateId(),
      simulationId: simulation.id,
      outcomes,
      confidence: 0.85,
      executionTime: 0,
      iterations,
    };
  }

  /**
   * Run scenario planning simulation
   */
  private async runScenarioPlanningSimulation(
    simulation: Simulation,
    leaks: RevenueLeak[]
  ): Promise<SimulationResult> {
    const baselineRevenue = leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
    
    // Define scenarios
    const scenarios = [
      { name: 'Best Case', recoveryRate: 0.85, preventionRate: 0.3 },
      { name: 'Expected', recoveryRate: 0.65, preventionRate: 0.15 },
      { name: 'Worst Case', recoveryRate: 0.45, preventionRate: 0.05 },
    ];

    const outcomes: SimulationOutcome[] = scenarios.map(scenario => {
      const recovered = baselineRevenue * scenario.recoveryRate;
      const prevented = baselineRevenue * scenario.preventionRate;
      const totalSaved = recovered + prevented;

      return {
        metric: `${scenario.name.toLowerCase().replace(' ', '_')}_scenario`,
        baselineValue: baselineRevenue,
        simulatedValue: totalSaved,
        change: totalSaved - baselineRevenue * 0.65,
        changePercent: ((totalSaved - baselineRevenue * 0.65) / (baselineRevenue * 0.65)) * 100,
        confidence: scenario.name === 'Expected' ? 0.8 : 0.6,
      };
    });

    return {
      id: generateId(),
      simulationId: simulation.id,
      outcomes,
      confidence: 0.75,
      executionTime: 0,
    };
  }

  /**
   * Run sensitivity analysis
   */
  private async runSensitivityAnalysis(
    simulation: Simulation,
    leaks: RevenueLeak[]
  ): Promise<SimulationResult> {
    const baselineRevenue = leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
    const outcomes: SimulationOutcome[] = [];

    // Analyze sensitivity to each parameter
    const sensitivityFactors = [
      { param: 'recovery_rate', weight: 0.4, baseValue: 0.65 },
      { param: 'time_to_detect', weight: 0.25, baseValue: 7 },
      { param: 'false_positive_rate', weight: 0.2, baseValue: 0.1 },
      { param: 'automation_level', weight: 0.15, baseValue: 0.5 },
    ];

    for (const factor of sensitivityFactors) {
      // Calculate impact of ±20% change
      const lowValue = factor.baseValue * 0.8;
      const highValue = factor.baseValue * 1.2;
      
      const lowImpact = this.calculateParameterImpact(baselineRevenue, factor.param, lowValue);
      const highImpact = this.calculateParameterImpact(baselineRevenue, factor.param, highValue);
      
      outcomes.push({
        metric: `sensitivity_${factor.param}`,
        baselineValue: factor.baseValue,
        simulatedValue: factor.baseValue,
        change: highImpact - lowImpact,
        changePercent: ((highImpact - lowImpact) / baselineRevenue) * 100,
        confidence: 0.7,
      });
    }

    return {
      id: generateId(),
      simulationId: simulation.id,
      outcomes,
      confidence: 0.7,
      executionTime: 0,
    };
  }

  /**
   * Calculate parameter impact on revenue
   */
  private calculateParameterImpact(
    baseRevenue: number,
    parameter: string,
    value: number
  ): number {
    switch (parameter) {
      case 'recovery_rate':
        return baseRevenue * value;
      case 'time_to_detect':
        // Faster detection means less lost revenue
        return baseRevenue * (1 - value * 0.01);
      case 'false_positive_rate':
        // Higher false positives mean wasted resources
        return baseRevenue * (1 - value * 0.1);
      case 'automation_level':
        // Higher automation means more consistent recovery
        return baseRevenue * (0.5 + value * 0.3);
      default:
        return baseRevenue;
    }
  }

  /**
   * Calculate overall confidence from outcomes
   */
  private calculateOverallConfidence(outcomes: SimulationOutcome[]): number {
    if (outcomes.length === 0) return 0;
    return outcomes.reduce((sum, o) => sum + o.confidence, 0) / outcomes.length;
  }

  /**
   * Get current value for a parameter from leak data
   */
  private getCurrentValue(leaks: RevenueLeak[], paramName: string): number | string {
    switch (paramName) {
      case 'total_revenue_at_risk':
        return leaks.reduce((sum, l) => sum + l.potentialRevenue, 0);
      case 'leak_count':
        return leaks.length;
      case 'critical_ratio':
        return leaks.filter(l => l.severity === 'critical').length / (leaks.length || 1);
      case 'detection_threshold':
        return 1000; // Default threshold
      case 'recovery_rate':
        return 0.65; // Default assumption
      case 'prevention_effectiveness':
        return 0.15; // Default assumption
      default:
        return 0;
    }
  }

  /**
   * Apply a change to a value
   */
  private applyChange(currentValue: number | string, change: number | string): number | string {
    if (typeof currentValue === 'string') {
      return change;
    }
    
    if (typeof change === 'string') {
      // Percentage change
      if (change.endsWith('%')) {
        const percent = parseFloat(change) / 100;
        return currentValue * (1 + percent);
      }
      return parseFloat(change);
    }
    
    // Absolute change
    return currentValue + change;
  }

  /**
   * Compare multiple scenarios
   */
  compareScenarios(simulationIds: string[]): {
    comparison: Array<{
      simulationId: string;
      simulationName: string;
      totalImpact: number;
      confidence: number;
    }>;
    recommendation: string;
  } {
    const comparison = simulationIds.map(id => {
      const simulation = this.simulations.get(id);
      const result = simulation?.results;
      
      if (!simulation || !result) {
        return {
          simulationId: id,
          simulationName: 'Unknown',
          totalImpact: 0,
          confidence: 0,
        };
      }

      const totalImpact = result.outcomes.reduce((sum, o) => sum + o.change, 0);

      return {
        simulationId: id,
        simulationName: simulation.name,
        totalImpact,
        confidence: result.confidence,
      };
    });

    // Sort by impact and confidence
    const ranked = [...comparison].sort((a, b) => {
      const scoreA = a.totalImpact * a.confidence;
      const scoreB = b.totalImpact * b.confidence;
      return scoreB - scoreA;
    });

    const best = ranked[0];
    const recommendation = best.totalImpact > 0
      ? `Recommend scenario "${best.simulationName}" with projected impact of $${best.totalImpact.toFixed(0)} at ${(best.confidence * 100).toFixed(0)}% confidence.`
      : 'No scenario shows positive impact. Consider revising parameters.';

    return { comparison, recommendation };
  }

  /**
   * Get all simulations
   */
  getSimulations(): Simulation[] {
    return Array.from(this.simulations.values());
  }

  /**
   * Get simulation by ID
   */
  getSimulation(simulationId: string): Simulation | undefined {
    return this.simulations.get(simulationId);
  }

  /**
   * Get result by ID
   */
  getResult(resultId: string): SimulationResult | undefined {
    return this.results.get(resultId);
  }

  /**
   * Delete a simulation
   */
  deleteSimulation(simulationId: string): boolean {
    const simulation = this.simulations.get(simulationId);
    if (!simulation) return false;

    // Remove associated results
    if (simulation.results) {
      this.results.delete(simulation.results.id);
    }

    return this.simulations.delete(simulationId);
  }

  /**
   * Get simulation statistics
   */
  getStats(): {
    totalSimulations: number;
    completedSimulations: number;
    byType: Record<string, number>;
    averageConfidence: number;
  } {
    const simulations = this.getSimulations();
    const completed = simulations.filter(s => s.status === 'completed');
    
    const byType = simulations.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgConfidence = completed.length > 0
      ? completed.reduce((sum, s) => sum + (s.results?.confidence || 0), 0) / completed.length
      : 0;

    return {
      totalSimulations: simulations.length,
      completedSimulations: completed.length,
      byType,
      averageConfidence: avgConfidence,
    };
  }
}

export default SimulationEngine;
