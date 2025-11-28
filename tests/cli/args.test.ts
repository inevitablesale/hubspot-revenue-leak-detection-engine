/**
 * Tests for CLI argument parser
 */

import { parseArgs } from '../../src/cli/utils/args';

describe('parseArgs', () => {
  describe('command parsing', () => {
    it('should parse a simple command', () => {
      const result = parseArgs(['init']);
      expect(result.command).toBe('init');
      expect(result.options).toEqual({});
      expect(result.args).toEqual([]);
    });

    it('should parse command with arguments', () => {
      const result = parseArgs(['config', 'show']);
      expect(result.command).toBe('config');
      expect(result.args).toEqual(['show']);
    });
  });

  describe('option parsing', () => {
    it('should parse long options with =', () => {
      const result = parseArgs(['--config=myconfig.yaml', 'scan']);
      expect(result.options['config']).toBe('myconfig.yaml');
      expect(result.command).toBe('scan');
    });

    it('should parse long options with space', () => {
      const result = parseArgs(['--config', 'myconfig.yaml', 'scan']);
      expect(result.options['config']).toBe('myconfig.yaml');
      expect(result.command).toBe('scan');
    });

    it('should parse boolean flags', () => {
      const result = parseArgs(['--verbose', '--quiet', 'scan']);
      expect(result.options['verbose']).toBe('true');
      expect(result.options['quiet']).toBe('true');
      expect(result.command).toBe('scan');
    });

    it('should parse short options', () => {
      const result = parseArgs(['-c', 'config.yaml', '-v', 'scan']);
      expect(result.options['c']).toBe('config.yaml');
      expect(result.options['v']).toBe('true');
    });

    it('should parse module flags', () => {
      const result = parseArgs(['scan', '--enable-email-leak', '--enable-forecast']);
      expect(result.command).toBe('scan');
      expect(result.options['enable-email-leak']).toBe('true');
      expect(result.options['enable-forecast']).toBe('true');
    });

    it('should parse integration flags', () => {
      const result = parseArgs(['scan', '--outlook', '--stripe', '--quickbooks']);
      expect(result.options['outlook']).toBe('true');
      expect(result.options['stripe']).toBe('true');
      expect(result.options['quickbooks']).toBe('true');
    });

    it('should parse compliance flag', () => {
      const result = parseArgs(['init', '--compliance', 'hipaa']);
      expect(result.options['compliance']).toBe('hipaa');
    });

    it('should parse template flag', () => {
      const result = parseArgs(['init', '--template', 'saas']);
      expect(result.options['template']).toBe('saas');
    });
  });

  describe('mixed arguments', () => {
    it('should handle complex command line', () => {
      const result = parseArgs([
        'scan',
        '--config', 'prod.yaml',
        '--enable-email-leak',
        '--dedupe',
        '--compliance', 'gdpr',
        '--verbose',
      ]);

      expect(result.command).toBe('scan');
      expect(result.options['config']).toBe('prod.yaml');
      expect(result.options['enable-email-leak']).toBe('true');
      expect(result.options['dedupe']).toBe('true');
      expect(result.options['compliance']).toBe('gdpr');
      expect(result.options['verbose']).toBe('true');
    });

    it('should handle empty arguments', () => {
      const result = parseArgs([]);
      expect(result.command).toBeUndefined();
      expect(result.options).toEqual({});
      expect(result.args).toEqual([]);
    });
  });
});
