const decoder = new TextDecoder();

export const resolveDir = (directory: string): string => {
  if (directory.startsWith("/")) return directory;
  return `${Deno.cwd()}/${directory}`;
};

const readConfig = async (dir: string): Promise<Record<string, unknown>> => {
  const path = `${dir}/deno.json`;
  try {
    const text = await Deno.readTextFile(path);
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${path} must be a JSON object`);
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return {};
    throw error;
  }
};

const writeConfig = async (dir: string, config: Record<string, unknown>): Promise<void> => {
  await Deno.writeTextFile(`${dir}/deno.json`, JSON.stringify(config, null, 2) + "\n");
};

const existsFile = async (path: string): Promise<boolean> => {
  try {
    const st = await Deno.stat(path);
    return st.isFile;
  } catch {
    return false;
  }
};

/** Entrypoint relative to the project dir: --entry, exports["."], main.ts, then mod.ts. */
export const resolveEntry = async (dir: string, entry?: string): Promise<string> => {
  if (entry) return entry;
  const config = await readConfig(dir);
  const exports = config.exports;
  if (typeof exports === "string" && exports.length > 0) return exports;
  if (exports && typeof exports === "object" && !Array.isArray(exports)) {
    const main = (exports as Record<string, unknown>)["."];
    if (typeof main === "string" && main.length > 0) return main;
  }
  if (await existsFile(`${dir}/main.ts`)) return "main.ts";
  if (await existsFile(`${dir}/mod.ts`)) return "mod.ts";
  throw new Error(
    'No entrypoint. Pass --entry, or add exports["."] in deno.json, or add main.ts / mod.ts.',
  );
};

export const ensureDir = async (directory: string): Promise<string> => {
  const abs = resolveDir(directory);
  try {
    const st = await Deno.stat(abs);
    if (!st.isDirectory) throw new Error(`${abs} is not a directory`);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) throw new Error(`No directory at ${abs}`);
    throw error;
  }
  return abs;
};

export const spawnDeno = async (
  cwd: string,
  args: string[],
  extraEnv?: Record<string, string>,
): Promise<{ stdout: string; stderr: string }> => {
  const cmd = new Deno.Command("deno", {
    args,
    cwd,
    env: extraEnv,
    stdout: "piped",
    stderr: "piped",
  });
  const output = await cmd.output();
  const stdout = decoder.decode(output.stdout);
  const stderr = decoder.decode(output.stderr);
  if (!output.success) {
    const detail = stderr.trim() || stdout.trim() ||
      `deno ${args.join(" ")} failed (${output.code})`;
    throw new Error(detail);
  }
  return { stdout, stderr };
};

/** Merge vendor: true into deno.json, install the entrypoint, leave vendor/ and deno.lock. */
export const seal = async (directory: string, entry?: string): Promise<string> => {
  const dir = await ensureDir(directory);
  const config = await readConfig(dir);
  config.vendor = true;
  await writeConfig(dir, config);
  const resolved = await resolveEntry(dir, entry);
  await spawnDeno(dir, ["install", "--entrypoint", resolved]);
  return [
    `Sealed ${dir}`,
    `entry: ${resolved}`,
    "Copy the folder, including vendor/ and deno.lock, onto the isolated box.",
    `Then: deno run --cached-only ${resolved}`,
  ].join("\n") + "\n";
};

/**
 * Fail if the project still needs the network.
 *
 * Runs `deno check --cached-only` and `deno install --cached-only --entrypoint`
 * with an empty DENO_DIR so a populated global cache cannot hide a missing vendor/.
 */
export const check = async (directory: string, entry?: string): Promise<string> => {
  const dir = await ensureDir(directory);
  const resolved = await resolveEntry(dir, entry);
  const cacheDir = await Deno.makeTempDir({ prefix: "decomm-pack-cache-" });
  try {
    const env = { DENO_DIR: cacheDir };
    await spawnDeno(dir, ["check", "--cached-only", resolved], env);
    await spawnDeno(dir, ["install", "--cached-only", "--entrypoint", resolved], env);
  } finally {
    await Deno.remove(cacheDir, { recursive: true });
  }
  return "ok\n";
};
