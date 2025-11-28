/**
 * Argument Parser for CLI
 */

export interface ParsedArgs {
  command: string | undefined;
  options: Record<string, string>;
  args: string[];
}

/**
 * Parse command line arguments
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const options: Record<string, string> = {};
  const args: string[] = [];
  let command: string | undefined;
  let i = 0;

  // First non-option argument is the command
  while (i < argv.length) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      // Long option
      const [key, value] = arg.slice(2).split('=');
      if (value !== undefined) {
        options[key] = value;
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        // Check if next arg is the value (not another flag)
        const nextArg = argv[i + 1];
        if (!['init', 'scan', 'config', 'dashboard'].includes(nextArg)) {
          options[key] = nextArg;
          i++;
        } else {
          options[key] = 'true';
        }
      } else {
        options[key] = 'true';
      }
    } else if (arg.startsWith('-')) {
      // Short option
      const key = arg.slice(1);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        const nextArg = argv[i + 1];
        if (!['init', 'scan', 'config', 'dashboard'].includes(nextArg)) {
          options[key] = nextArg;
          i++;
        } else {
          options[key] = 'true';
        }
      } else {
        options[key] = 'true';
      }
    } else if (!command) {
      // First positional argument is command
      command = arg;
    } else {
      // Additional positional arguments
      args.push(arg);
    }

    i++;
  }

  return { command, options, args };
}
