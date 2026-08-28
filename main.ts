/**
 * Seal a Deno project so it runs after the cable comes out.
 *
 * This is **not** Deno's `pack` command (npm tarballs). `seal` writes
 * `"vendor": true` into `deno.json`, runs `deno install --entrypoint`, and
 * leaves `vendor/` plus `deno.lock` in the app folder. Copy that folder onto
 * the isolated box and run with `--cached-only`.
 *
 * Use {@linkcode run} from the CLI. Point `seal` or `check` at a project
 * directory.
 *
 * @example Seal a project
 * ```ts
 * import { run } from "jsr:@decomm/pack";
 *
 * await run(["seal", "./my-app"]);
 * await run(["check", "./my-app"]);
 * ```
 *
 * @module
 */

import { parseArgs } from "./args.ts";
import { check, seal } from "./seal.ts";

const HELP = `decomm pack

Seal a Deno project so it runs after the cable comes out.

This is not Deno pack (npm tarballs). seal vendors the graph into the
app folder. Copy that folder onto the isolated box and run --cached-only.

Commands:
  seal <dir>           Merge vendor: true and install the entrypoint
  check <dir>          Fail if the project still needs the network
  help                 This text

Examples:
  ./pack.sh seal ./my-app
  ./pack.sh seal ./my-app --entry main.ts
  ./pack.sh check ./my-app
  deno run --cached-only main.ts
  deno task compile
`;

/**
 * Run one CLI command and return the text that would be printed.
 *
 * Commands: `seal`, `check`. `seal` vendors the project. `check` fails if it
 * still needs the network.
 *
 * @param argv Arguments after the binary name, including `--entry`.
 * @returns Help text, or a trailing-newline status string for the command.
 *
 * @example
 * ```ts
 * import { run } from "jsr:@decomm/pack";
 * await run(["seal", "./my-app"]);
 * ```
 */
export async function run(argv: string[]): Promise<string> {
  const args = parseArgs(argv);
  if (args.help || args.command === "" || args.command === "help") return HELP;

  switch (args.command) {
    case "seal": {
      if (!args.dir) throw new Error("seal needs a directory");
      return await seal(args.dir, args.entry);
    }
    case "check": {
      if (!args.dir) throw new Error("check needs a directory");
      return await check(args.dir, args.entry);
    }
    default:
      throw new Error(`Unknown command: ${args.command}`);
  }
}

if (import.meta.main) {
  try {
    const out = await run(Deno.args);
    if (out) console.log(out.endsWith("\n") ? out.slice(0, -1) : out);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
