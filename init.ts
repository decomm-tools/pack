/**
 * Copy this package into a folder you can carry onto an isolated machine.
 *
 * Writes `main.ts`, `args.ts`, `seal.ts`, `pack.sh`, and `deno.json`. On a
 * connected box run `deno task compile`, then use `./pack.sh seal` on a project
 * while you still have a network.
 *
 * @example
 * ```ts
 * import { init } from "jsr:@decomm/pack/init";
 *
 * await init("./pack");
 * ```
 *
 * @module
 */
const HELP = `decomm pack

Copy this tool into a folder you can carry onto an isolated machine.

  deno run -A jsr:@decomm/pack/init ./pack
  cd pack
  deno task compile
  ./pack.sh seal ./my-app
`;

const join = (root: string, name: string): string => `${root}/${name}`;

const resolveDir = (directory: string): string => {
  if (directory.startsWith("/")) return directory;
  return `${Deno.cwd()}/${directory}`;
};

const FILES = [
  "main.ts",
  "args.ts",
  "seal.ts",
  "pack.sh",
  "deno.json",
  "README.md",
  "LICENSE",
] as const;

/**
 * Read one of this package's files next to `init.ts`. Works from a local
 * checkout (`file:`) and from JSR or any other `http(s):` URL, where there is no
 * directory on disk to read from.
 */
const readSource = async (name: string): Promise<Uint8Array> => {
  const url = new URL(name, import.meta.url);
  if (url.protocol === "file:") return await Deno.readFile(url);
  if (url.protocol === "http:" || url.protocol === "https:") {
    const response = await fetch(url);
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Could not fetch ${url.href}: ${response.status} ${response.statusText}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }
  throw new Error(`init cannot read its files from a ${url.protocol} URL`);
};

/**
 * Write a self-contained pack tree into `directory`.
 *
 * @param directory Destination folder (created if missing). Relative paths are
 * resolved from the current working directory.
 * @param options.force Overwrite when the folder already has files. Without
 * this, a TTY is prompted; a non-TTY run throws.
 */
export const init = async (
  directory: string,
  options: { force?: boolean } = {},
): Promise<void> => {
  const root = resolveDir(directory);
  // Read everything before touching the destination, so a failed fetch writes nothing.
  const sources = await Promise.all(
    FILES.map(async (name) => [name, await readSource(name)] as const),
  );

  await Deno.mkdir(root, { recursive: true });
  const existing = [...Deno.readDirSync(root)];
  if (existing.length > 0 && !options.force) {
    if (!Deno.stdin.isTerminal()) {
      throw new Error("Directory is not empty. Re-run with --force.");
    }
    const ok = confirm("Directory is not empty. Continue?");
    if (!ok) throw new Error("Directory is not empty, aborting.");
  }

  for (const [name, bytes] of sources) {
    await Deno.writeFile(join(root, name), bytes);
  }
  await Deno.chmod(join(root, "pack.sh"), 0o755);

  console.log(`Pack copied to ${root}`);
  console.log("On a connected machine: deno task compile");
  console.log("Then: ./pack.sh seal ./my-app");
};

if (import.meta.main) {
  const args = Deno.args;
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    console.log(HELP);
    Deno.exit(args.length === 0 ? 2 : 0);
  }
  const force = args.includes("--force") || args.includes("-f");
  const directory = args.find((arg) => !arg.startsWith("-"));
  if (!directory) {
    console.log(HELP);
    Deno.exit(2);
  }
  try {
    await init(directory, { force });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
