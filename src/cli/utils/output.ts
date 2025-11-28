/**
 * CLI Output Utilities
 */

/**
 * Print help information
 */
export function printHelp(): void {
  console.log(`
Revenue Leak Detection Engine CLI

USAGE:
  leak-engine <command> [options]

COMMANDS:
  init              Initialize a new configuration file interactively
  scan              Run leak detection scan
  config            View or modify configuration
  dashboard         Generate ROI dashboard

OPTIONS:
  -h, --help                    Show this help message
  -v, --version                 Show version number
  -c, --config <path>           Path to configuration file (default: ./leak-engine.config.yaml)
  --verbose                     Enable verbose output
  -q, --quiet                   Suppress banner and non-essential output

MODULE FLAGS:
  --enable-email-leak           Enable email inactivity detection
  --enable-duplicate-deals      Enable duplicate deal detection
  --enable-forecast             Enable forecast agent

INTEGRATION FLAGS:
  --outlook                     Enable Outlook integration
  --quickbooks                  Enable QuickBooks integration
  --stripe                      Enable Stripe integration
  --shopify                     Enable Shopify integration
  --gmail                       Enable Gmail integration

FEATURE FLAGS:
  --skip-cleanup                Skip data cleanup phase
  --dedupe                      Run deduplication before analysis
  --compliance <mode>           Enable compliance mode (hipaa, gdpr)

TEMPLATES:
  --template <type>             Use industry template (saas, agency, healthcare, consulting, retail)

EXAMPLES:
  $ leak-engine init
  $ leak-engine init --template saas
  $ leak-engine scan --enable-email-leak --dedupe
  $ leak-engine scan --compliance hipaa --outlook
  $ leak-engine dashboard --config ./my-config.yaml
  $ leak-engine config show
  $ leak-engine config set hubspot.pipeline "Sales Pipeline"

For more information, visit: https://github.com/your-org/hubspot-revenue-leak-detection-engine
`);
}

/**
 * Print version
 */
export function printVersion(version: string): void {
  console.log(`Revenue Leak Detection Engine v${version}`);
}

/**
 * Print banner
 */
export function printBanner(): void {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           Revenue Leak Detection Engine                        ║
║           Identify and recover hidden revenue leaks           ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

/**
 * Print success message
 */
export function printSuccess(message: string): void {
  console.log(`✅ ${message}`);
}

/**
 * Print warning message
 */
export function printWarning(message: string): void {
  console.log(`⚠️  ${message}`);
}

/**
 * Print error message
 */
export function printError(message: string): void {
  console.error(`❌ ${message}`);
}

/**
 * Print info message
 */
export function printInfo(message: string): void {
  console.log(`ℹ️  ${message}`);
}

/**
 * Print a step in a process
 */
export function printStep(step: number, total: number, message: string): void {
  console.log(`[${step}/${total}] ${message}`);
}

/**
 * Print a task list item
 */
export function printTask(completed: boolean, message: string): void {
  const icon = completed ? '✓' : '○';
  console.log(`  ${icon} ${message}`);
}

/**
 * Print a section header
 */
export function printSection(title: string): void {
  console.log(`\n━━━ ${title} ━━━\n`);
}

/**
 * Print a key-value pair
 */
export function printKeyValue(key: string, value: string | number | boolean): void {
  console.log(`  ${key}: ${value}`);
}

/**
 * Print a table
 */
export function printTable(headers: string[], rows: string[][]): void {
  const colWidths = headers.map((h, i) => 
    Math.max(h.length, ...rows.map(r => String(r[i] || '').length))
  );

  const separator = colWidths.map(w => '─'.repeat(w + 2)).join('┼');
  const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join(' │ ');

  console.log(`┌${separator.replace(/┼/g, '┬')}┐`);
  console.log(`│ ${headerRow} │`);
  console.log(`├${separator}┤`);

  for (const row of rows) {
    const dataRow = row.map((cell, i) => String(cell || '').padEnd(colWidths[i])).join(' │ ');
    console.log(`│ ${dataRow} │`);
  }

  console.log(`└${separator.replace(/┼/g, '┴')}┘`);
}
