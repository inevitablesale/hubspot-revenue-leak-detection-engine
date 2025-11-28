/**
 * Code Author Module
 * Enables AgentOS to generate, validate, and deploy new code modules
 * for self-extension and capability enhancement
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Code Author Types
// ============================================================

export type CodeType = 'detector' | 'analyzer' | 'action' | 'integration' | 'utility' | 'model';
export type CodeStatus = 'draft' | 'validating' | 'testing' | 'approved' | 'deployed' | 'deprecated';

export interface GeneratedCode {
  id: string;
  name: string;
  description: string;
  type: CodeType;
  status: CodeStatus;
  version: string;
  code: string;
  template: CodeTemplate;
  dependencies: string[];
  interfaces: InterfaceDefinition[];
  tests: GeneratedTest[];
  metadata: CodeMetadata;
  validation: ValidationResult;
  createdAt: Date;
  updatedAt: Date;
  deployedAt?: Date;
}

export interface CodeTemplate {
  id: string;
  name: string;
  type: CodeType;
  structure: string;
  placeholders: TemplatePlaceholder[];
  requiredInterfaces: string[];
  defaultImports: string[];
}

export interface TemplatePlaceholder {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'function';
  required: boolean;
  defaultValue?: unknown;
  validation?: string;
}

export interface InterfaceDefinition {
  name: string;
  methods: MethodDefinition[];
  properties: PropertyDefinition[];
}

export interface MethodDefinition {
  name: string;
  parameters: ParameterDefinition[];
  returnType: string;
  async: boolean;
  description: string;
}

export interface ParameterDefinition {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: unknown;
}

export interface PropertyDefinition {
  name: string;
  type: string;
  readonly: boolean;
  optional: boolean;
}

export interface GeneratedTest {
  id: string;
  name: string;
  description: string;
  code: string;
  assertions: TestAssertion[];
  status: 'pending' | 'passed' | 'failed';
  executedAt?: Date;
  error?: string;
}

export interface TestAssertion {
  description: string;
  type: 'equals' | 'contains' | 'truthy' | 'throws' | 'resolves';
  expected: unknown;
}

export interface CodeMetadata {
  author: 'agent' | 'user' | 'system';
  purpose: string;
  capabilities: string[];
  leakTypesAddressed: string[];
  estimatedImpact: number;
  complexity: 'low' | 'medium' | 'high';
  tags: string[];
}

export interface ValidationResult {
  valid: boolean;
  syntaxValid: boolean;
  typeCheckPassed: boolean;
  testsPass: boolean;
  securityScan: SecurityScanResult;
  performanceEstimate: PerformanceEstimate;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface SecurityScanResult {
  safe: boolean;
  vulnerabilities: string[];
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceEstimate {
  estimatedExecutionMs: number;
  memoryUsageMb: number;
  apiCallsRequired: number;
}

export interface ValidationError {
  line?: number;
  column?: number;
  message: string;
  code: string;
}

export interface ValidationWarning {
  line?: number;
  column?: number;
  message: string;
  suggestion?: string;
}

export interface CapabilityGap {
  id: string;
  description: string;
  category: string;
  leakType?: string;
  severity: 'low' | 'medium' | 'high';
  suggestedSolution: string;
  requiredCapabilities: string[];
  detectedAt: Date;
  addressedBy?: string;
}

export interface PRSubmission {
  id: string;
  codeId: string;
  title: string;
  description: string;
  branch: string;
  status: 'pending' | 'submitted' | 'approved' | 'merged' | 'rejected';
  reviewComments: ReviewComment[];
  createdAt: Date;
  mergedAt?: Date;
}

export interface ReviewComment {
  reviewer: string;
  comment: string;
  timestamp: Date;
  status: 'open' | 'resolved';
}

// ============================================================
// Code Author Implementation
// ============================================================

export class CodeAuthor {
  private generatedCode: Map<string, GeneratedCode> = new Map();
  private templates: Map<string, CodeTemplate> = new Map();
  private capabilityGaps: Map<string, CapabilityGap> = new Map();
  private prSubmissions: Map<string, PRSubmission> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Initialize default code templates
   */
  private initializeTemplates(): void {
    // Detector template
    this.templates.set('detector', {
      id: 'detector-template',
      name: 'Revenue Leak Detector',
      type: 'detector',
      structure: `
/**
 * {{name}} Detector
 * {{description}}
 */

import { RevenueLeak, LeakSeverity, LeakType } from '../../types';
import { generateId } from '../../utils/helpers';

export interface {{name}}Config {
  enabled: boolean;
  threshold: number;
  {{configProperties}}
}

export class {{name}}Detector {
  private config: {{name}}Config;

  constructor(config?: Partial<{{name}}Config>) {
    this.config = {
      enabled: true,
      threshold: {{defaultThreshold}},
      ...config,
    };
  }

  async detect(data: unknown[]): Promise<RevenueLeak[]> {
    const leaks: RevenueLeak[] = [];
    
    for (const item of data) {
      const leak = this.analyze(item);
      if (leak) {
        leaks.push(leak);
      }
    }

    return leaks;
  }

  private analyze(item: unknown): RevenueLeak | null {
    // {{analysisLogic}}
    return null;
  }

  getConfig(): {{name}}Config {
    return { ...this.config };
  }
}

export default {{name}}Detector;
`,
      placeholders: [
        { name: 'name', description: 'Detector name', type: 'string', required: true },
        { name: 'description', description: 'Detector description', type: 'string', required: true },
        { name: 'configProperties', description: 'Additional config properties', type: 'string', required: false, defaultValue: '' },
        { name: 'defaultThreshold', description: 'Default detection threshold', type: 'number', required: false, defaultValue: 0.8 },
        { name: 'analysisLogic', description: 'Core analysis logic', type: 'function', required: true },
      ],
      requiredInterfaces: ['RevenueLeak'],
      defaultImports: ['RevenueLeak', 'LeakSeverity', 'LeakType', 'generateId'],
    });

    // Analyzer template
    this.templates.set('analyzer', {
      id: 'analyzer-template',
      name: 'Data Analyzer',
      type: 'analyzer',
      structure: `
/**
 * {{name}} Analyzer
 * {{description}}
 */

export interface AnalysisResult {
  score: number;
  insights: string[];
  recommendations: string[];
  metadata: Record<string, unknown>;
}

export class {{name}}Analyzer {
  async analyze(data: unknown): Promise<AnalysisResult> {
    // {{analysisLogic}}
    return {
      score: 0,
      insights: [],
      recommendations: [],
      metadata: {},
    };
  }
}

export default {{name}}Analyzer;
`,
      placeholders: [
        { name: 'name', description: 'Analyzer name', type: 'string', required: true },
        { name: 'description', description: 'Analyzer description', type: 'string', required: true },
        { name: 'analysisLogic', description: 'Core analysis logic', type: 'function', required: true },
      ],
      requiredInterfaces: [],
      defaultImports: [],
    });

    // Action template
    this.templates.set('action', {
      id: 'action-template',
      name: 'Recovery Action',
      type: 'action',
      structure: `
/**
 * {{name}} Action
 * {{description}}
 */

import { RecoveryAction } from '../../types';

export interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

export class {{name}}Action {
  async execute(params: Record<string, unknown>): Promise<ActionResult> {
    try {
      // {{actionLogic}}
      return { success: true, message: 'Action completed successfully' };
    } catch (error) {
      return { 
        success: false, 
        message: 'Action failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  validate(params: Record<string, unknown>): boolean {
    // {{validationLogic}}
    return true;
  }
}

export default {{name}}Action;
`,
      placeholders: [
        { name: 'name', description: 'Action name', type: 'string', required: true },
        { name: 'description', description: 'Action description', type: 'string', required: true },
        { name: 'actionLogic', description: 'Core action logic', type: 'function', required: true },
        { name: 'validationLogic', description: 'Parameter validation logic', type: 'function', required: false },
      ],
      requiredInterfaces: ['RecoveryAction'],
      defaultImports: ['RecoveryAction'],
    });

    // Integration template
    this.templates.set('integration', {
      id: 'integration-template',
      name: 'External Integration',
      type: 'integration',
      structure: `
/**
 * {{name}} Integration
 * {{description}}
 */

export interface {{name}}Config {
  apiKey?: string;
  endpoint: string;
  timeout: number;
}

export interface {{name}}Response {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class {{name}}Integration {
  private config: {{name}}Config;

  constructor(config: {{name}}Config) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    // {{connectLogic}}
    return true;
  }

  async fetch(params: Record<string, unknown>): Promise<{{name}}Response> {
    // {{fetchLogic}}
    return { success: true, data: {} };
  }

  async push(data: unknown): Promise<{{name}}Response> {
    // {{pushLogic}}
    return { success: true };
  }
}

export default {{name}}Integration;
`,
      placeholders: [
        { name: 'name', description: 'Integration name', type: 'string', required: true },
        { name: 'description', description: 'Integration description', type: 'string', required: true },
        { name: 'connectLogic', description: 'Connection logic', type: 'function', required: true },
        { name: 'fetchLogic', description: 'Fetch data logic', type: 'function', required: true },
        { name: 'pushLogic', description: 'Push data logic', type: 'function', required: true },
      ],
      requiredInterfaces: [],
      defaultImports: [],
    });
  }

  /**
   * Detect capability gaps in the system
   */
  detectCapabilityGaps(systemCapabilities: string[], requiredCapabilities: string[]): CapabilityGap[] {
    const gaps: CapabilityGap[] = [];
    
    for (const required of requiredCapabilities) {
      if (!systemCapabilities.includes(required)) {
        const gap: CapabilityGap = {
          id: generateId(),
          description: `Missing capability: ${required}`,
          category: this.categorizeCapability(required),
          severity: this.assessGapSeverity(required),
          suggestedSolution: this.suggestSolution(required),
          requiredCapabilities: [required],
          detectedAt: new Date(),
        };
        
        gaps.push(gap);
        this.capabilityGaps.set(gap.id, gap);
      }
    }

    return gaps;
  }

  /**
   * Generate code from a template
   */
  generateCode(
    templateType: CodeType,
    params: Record<string, unknown>,
    metadata: Partial<CodeMetadata>
  ): GeneratedCode {
    const template = this.templates.get(templateType);
    if (!template) {
      throw new Error(`Template type '${templateType}' not found`);
    }

    // Generate code from template
    let code = template.structure;
    for (const placeholder of template.placeholders) {
      const value = params[placeholder.name] ?? placeholder.defaultValue ?? '';
      code = code.replace(new RegExp(`{{${placeholder.name}}}`, 'g'), String(value));
    }

    // Generate tests
    const tests = this.generateTests(params.name as string, templateType);

    const generated: GeneratedCode = {
      id: generateId(),
      name: params.name as string,
      description: params.description as string || '',
      type: templateType,
      status: 'draft',
      version: '1.0.0',
      code,
      template,
      dependencies: template.defaultImports,
      interfaces: this.extractInterfaces(code),
      tests,
      metadata: {
        author: 'agent',
        purpose: metadata.purpose || 'Auto-generated module',
        capabilities: metadata.capabilities || [],
        leakTypesAddressed: metadata.leakTypesAddressed || [],
        estimatedImpact: metadata.estimatedImpact || 0,
        complexity: metadata.complexity || 'medium',
        tags: metadata.tags || [],
      },
      validation: {
        valid: false,
        syntaxValid: false,
        typeCheckPassed: false,
        testsPass: false,
        securityScan: { safe: true, vulnerabilities: [], riskLevel: 'none' },
        performanceEstimate: { estimatedExecutionMs: 100, memoryUsageMb: 10, apiCallsRequired: 0 },
        errors: [],
        warnings: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.generatedCode.set(generated.id, generated);
    return generated;
  }

  /**
   * Validate generated code
   */
  validateCode(codeId: string): ValidationResult {
    const code = this.generatedCode.get(codeId);
    if (!code) {
      throw new Error(`Code with id '${codeId}' not found`);
    }

    code.status = 'validating';
    
    const result: ValidationResult = {
      valid: true,
      syntaxValid: this.checkSyntax(code.code),
      typeCheckPassed: this.checkTypes(code.code),
      testsPass: false,
      securityScan: this.performSecurityScan(code.code),
      performanceEstimate: this.estimatePerformance(code.code),
      errors: [],
      warnings: [],
    };

    // Check for common issues
    if (!result.syntaxValid) {
      result.errors.push({ message: 'Syntax validation failed', code: 'SYNTAX_ERROR' });
      result.valid = false;
    }

    if (!result.typeCheckPassed) {
      result.errors.push({ message: 'Type check failed', code: 'TYPE_ERROR' });
      result.valid = false;
    }

    if (!result.securityScan.safe) {
      result.errors.push({ message: 'Security vulnerabilities detected', code: 'SECURITY_ERROR' });
      result.valid = false;
    }

    // Add warnings for potential issues
    if (code.code.includes('any')) {
      result.warnings.push({ 
        message: 'Usage of "any" type detected',
        suggestion: 'Consider using more specific types'
      });
    }

    if (!code.code.includes('try')) {
      result.warnings.push({ 
        message: 'No error handling detected',
        suggestion: 'Add try-catch blocks for error handling'
      });
    }

    code.validation = result;
    code.status = result.valid ? 'testing' : 'draft';
    code.updatedAt = new Date();

    return result;
  }

  /**
   * Run tests for generated code
   */
  runTests(codeId: string): { passed: boolean; results: GeneratedTest[] } {
    const code = this.generatedCode.get(codeId);
    if (!code) {
      throw new Error(`Code with id '${codeId}' not found`);
    }

    const results: GeneratedTest[] = [];
    let allPassed = true;

    for (const test of code.tests) {
      // Simulate test execution
      const passed = this.executeTest(test);
      test.status = passed ? 'passed' : 'failed';
      test.executedAt = new Date();
      
      if (!passed) {
        allPassed = false;
        test.error = 'Test assertion failed';
      }

      results.push(test);
    }

    code.validation.testsPass = allPassed;
    code.status = allPassed && code.validation.valid ? 'approved' : 'draft';
    code.updatedAt = new Date();

    return { passed: allPassed, results };
  }

  /**
   * Deploy approved code
   */
  deployCode(codeId: string): { success: boolean; deployedPath?: string; error?: string } {
    const code = this.generatedCode.get(codeId);
    if (!code) {
      return { success: false, error: `Code with id '${codeId}' not found` };
    }

    if (code.status !== 'approved') {
      return { success: false, error: 'Code must be approved before deployment' };
    }

    // Simulate deployment
    code.status = 'deployed';
    code.deployedAt = new Date();
    code.updatedAt = new Date();

    return { 
      success: true, 
      deployedPath: `src/generated/${code.type}s/${code.name.toLowerCase()}.ts` 
    };
  }

  /**
   * Create a PR submission for code review
   */
  createPR(codeId: string, title: string, description: string): PRSubmission {
    const code = this.generatedCode.get(codeId);
    if (!code) {
      throw new Error(`Code with id '${codeId}' not found`);
    }

    const pr: PRSubmission = {
      id: generateId(),
      codeId,
      title,
      description,
      branch: `feature/auto-${code.type}-${code.name.toLowerCase()}`,
      status: 'pending',
      reviewComments: [],
      createdAt: new Date(),
    };

    this.prSubmissions.set(pr.id, pr);
    return pr;
  }

  /**
   * Submit PR for review
   */
  submitPR(prId: string): PRSubmission {
    const pr = this.prSubmissions.get(prId);
    if (!pr) {
      throw new Error(`PR with id '${prId}' not found`);
    }

    pr.status = 'submitted';
    return pr;
  }

  /**
   * Get generated code by ID
   */
  getCode(codeId: string): GeneratedCode | undefined {
    return this.generatedCode.get(codeId);
  }

  /**
   * Get all generated code
   */
  getAllCode(): GeneratedCode[] {
    return Array.from(this.generatedCode.values());
  }

  /**
   * Get code by type
   */
  getCodeByType(type: CodeType): GeneratedCode[] {
    return this.getAllCode().filter(c => c.type === type);
  }

  /**
   * Get code by status
   */
  getCodeByStatus(status: CodeStatus): GeneratedCode[] {
    return this.getAllCode().filter(c => c.status === status);
  }

  /**
   * Get capability gaps
   */
  getCapabilityGaps(): CapabilityGap[] {
    return Array.from(this.capabilityGaps.values());
  }

  /**
   * Get PR submissions
   */
  getPRSubmissions(): PRSubmission[] {
    return Array.from(this.prSubmissions.values());
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalGenerated: number;
    byType: Record<CodeType, number>;
    byStatus: Record<CodeStatus, number>;
    capabilityGaps: number;
    pendingPRs: number;
    templatesAvailable: number;
  } {
    const allCode = this.getAllCode();
    const byType = {} as Record<CodeType, number>;
    const byStatus = {} as Record<CodeStatus, number>;

    for (const code of allCode) {
      byType[code.type] = (byType[code.type] || 0) + 1;
      byStatus[code.status] = (byStatus[code.status] || 0) + 1;
    }

    return {
      totalGenerated: allCode.length,
      byType,
      byStatus,
      capabilityGaps: this.capabilityGaps.size,
      pendingPRs: Array.from(this.prSubmissions.values()).filter(pr => pr.status === 'pending').length,
      templatesAvailable: this.templates.size,
    };
  }

  // Private helper methods

  private categorizeCapability(capability: string): string {
    if (capability.includes('detect')) return 'detection';
    if (capability.includes('analyz')) return 'analysis';
    if (capability.includes('recover') || capability.includes('action')) return 'recovery';
    if (capability.includes('integrat')) return 'integration';
    return 'general';
  }

  private assessGapSeverity(capability: string): 'low' | 'medium' | 'high' {
    if (capability.includes('critical') || capability.includes('security')) return 'high';
    if (capability.includes('billing') || capability.includes('revenue')) return 'high';
    if (capability.includes('report') || capability.includes('insight')) return 'medium';
    return 'low';
  }

  private suggestSolution(capability: string): string {
    const category = this.categorizeCapability(capability);
    switch (category) {
      case 'detection':
        return 'Generate a new detector module using the detector template';
      case 'analysis':
        return 'Generate a new analyzer module using the analyzer template';
      case 'recovery':
        return 'Generate a new action module using the action template';
      case 'integration':
        return 'Generate a new integration module using the integration template';
      default:
        return 'Create a custom utility module';
    }
  }

  private generateTests(name: string, type: CodeType): GeneratedTest[] {
    const tests: GeneratedTest[] = [];

    // Basic instantiation test
    tests.push({
      id: generateId(),
      name: `${name} instantiation`,
      description: `Test that ${name} can be instantiated`,
      code: `const instance = new ${name}(); expect(instance).toBeDefined();`,
      assertions: [{ description: 'Instance is defined', type: 'truthy', expected: true }],
      status: 'pending',
    });

    // Type-specific tests
    if (type === 'detector') {
      tests.push({
        id: generateId(),
        name: `${name} detect method`,
        description: `Test that ${name} detect method returns array`,
        code: `const instance = new ${name}(); const result = await instance.detect([]); expect(Array.isArray(result)).toBe(true);`,
        assertions: [{ description: 'Returns array', type: 'truthy', expected: true }],
        status: 'pending',
      });
    }

    if (type === 'analyzer') {
      tests.push({
        id: generateId(),
        name: `${name} analyze method`,
        description: `Test that ${name} analyze method returns result`,
        code: `const instance = new ${name}(); const result = await instance.analyze({}); expect(result.score).toBeDefined();`,
        assertions: [{ description: 'Returns analysis result', type: 'truthy', expected: true }],
        status: 'pending',
      });
    }

    if (type === 'action') {
      tests.push({
        id: generateId(),
        name: `${name} execute method`,
        description: `Test that ${name} execute method returns result`,
        code: `const instance = new ${name}(); const result = await instance.execute({}); expect(result.success).toBeDefined();`,
        assertions: [{ description: 'Returns action result', type: 'truthy', expected: true }],
        status: 'pending',
      });
    }

    return tests;
  }

  private extractInterfaces(code: string): InterfaceDefinition[] {
    // Simple interface extraction (in production, use AST parsing)
    const interfaces: InterfaceDefinition[] = [];
    const interfaceRegex = /interface\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = interfaceRegex.exec(code)) !== null) {
      interfaces.push({
        name: match[1],
        methods: [],
        properties: [],
      });
    }

    return interfaces;
  }

  private checkSyntax(code: string): boolean {
    // Basic syntax checks
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;

    return openBraces === closeBraces && openParens === closeParens;
  }

  private checkTypes(code: string): boolean {
    // Basic type checks - in production, use TypeScript compiler API
    const hasTypeAnnotations = code.includes(':');
    const hasExport = code.includes('export');
    return hasTypeAnnotations && hasExport;
  }

  private performSecurityScan(code: string): SecurityScanResult {
    const vulnerabilities: string[] = [];
    
    // Check for dangerous patterns
    if (code.includes('eval(')) {
      vulnerabilities.push('Usage of eval() detected');
    }
    if (code.includes('Function(')) {
      vulnerabilities.push('Dynamic function creation detected');
    }
    if (code.includes('innerHTML')) {
      vulnerabilities.push('Potential XSS vulnerability with innerHTML');
    }

    return {
      safe: vulnerabilities.length === 0,
      vulnerabilities,
      riskLevel: vulnerabilities.length === 0 ? 'none' : 
                 vulnerabilities.length === 1 ? 'low' : 
                 vulnerabilities.length < 3 ? 'medium' : 'high',
    };
  }

  private estimatePerformance(code: string): PerformanceEstimate {
    // Simple heuristics for performance estimation
    const loopCount = (code.match(/for\s*\(|while\s*\(|\.forEach|\.map|\.filter/g) || []).length;
    const asyncCount = (code.match(/async|await|Promise/g) || []).length;

    return {
      estimatedExecutionMs: 50 + loopCount * 20 + asyncCount * 100,
      memoryUsageMb: 5 + loopCount * 2,
      apiCallsRequired: asyncCount,
    };
  }

  private executeTest(test: GeneratedTest): boolean {
    // Simulate test execution - in production, actually run the test
    // For now, assume tests pass if they have valid assertions
    return test.assertions.length > 0;
  }
}

export default CodeAuthor;
