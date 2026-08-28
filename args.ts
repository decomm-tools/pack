export type PackArgs = {
  command: string;
  dir: string;
  help: boolean;
  entry?: string;
};

const take = (args: string[], i: number, flag: string): string => {
  const value = args[i];
  if (!value || value.startsWith("-")) throw new Error(`${flag} needs a value`);
  return value;
};

export const parseArgs = (argv: string[]): PackArgs => {
  const parsed: PackArgs = {
    command: "",
    dir: "",
    help: false,
  };
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--entry") parsed.entry = take(argv, ++i, "--entry");
    else if (arg === "--") continue;
    else if (!arg.startsWith("-")) rest.push(arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  parsed.command = rest[0] ?? "";
  parsed.dir = rest[1] ?? "";
  return parsed;
};
