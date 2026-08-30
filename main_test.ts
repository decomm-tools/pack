import { assertEquals, assertRejects, assertStringIncludes, assertThrows } from "@std/assert";
import { parseArgs } from "./args.ts";
import { run } from "./main.ts";

Deno.test("parseArgs seal ./app", () => {
  const args = parseArgs(["seal", "./app"]);
  assertEquals(args.command, "seal");
  assertEquals(args.dir, "./app");
});

Deno.test("parseArgs --entry", () => {
  const args = parseArgs(["seal", "./app", "--entry", "mod.ts"]);
  assertEquals(args.command, "seal");
  assertEquals(args.dir, "./app");
  assertEquals(args.entry, "mod.ts");
});

Deno.test("parseArgs unknown flag throws", () => {
  assertThrows(() => parseArgs(["--bogus"]), Error, "Unknown argument");
});

Deno.test("run --help is decomm pack", async () => {
  const text = await run(["--help"]);
  assertStringIncludes(text, "decomm pack");
  assertStringIncludes(text, "cached-only");
  assertEquals(text.includes("decomm ledger"), false);
});

Deno.test("run unknown command throws", async () => {
  await assertRejects(() => run(["nope"]), Error, "Unknown command");
});

Deno.test("run seal without dir throws", async () => {
  await assertRejects(() => run(["seal"]), Error, "seal needs a directory");
});

Deno.test("run check without dir throws", async () => {
  await assertRejects(() => run(["check"]), Error, "check needs a directory");
});

const packSh = async (args: string[]): Promise<string> => {
  const proc = new Deno.Command("sh", {
    args: [`${Deno.cwd()}/pack.sh`, ...args],
    cwd: Deno.cwd(),
    stdout: "piped",
    stderr: "piped",
  });
  const out = await proc.output();
  const stdout = new TextDecoder().decode(out.stdout);
  const stderr = new TextDecoder().decode(out.stderr);
  if (!out.success) throw new Error(stderr || stdout);
  return stdout;
};

Deno.test("pack.sh seal then run --cached-only is the carry-in example", async () => {
  const dir = await Deno.makeTempDir({ prefix: "decomm-pack-sh-" });
  try {
    await Deno.writeTextFile(
      `${dir}/main.ts`,
      'import { join } from "jsr:@std/path@1";\nconsole.log(join("a", "b"));\n',
    );
    const sealed = await packSh(["seal", dir]);
    assertStringIncludes(sealed, "Sealed");
    assertStringIncludes(sealed, "vendor/");
    assertStringIncludes(sealed, "cached-only");
    const vendor = await Deno.stat(`${dir}/vendor`);
    assertEquals(vendor.isDirectory, true);
    const proc = new Deno.Command("deno", {
      args: ["run", "--cached-only", "main.ts"],
      cwd: dir,
      stdout: "piped",
      stderr: "piped",
    });
    const out = await proc.output();
    const stdout = new TextDecoder().decode(out.stdout);
    const stderr = new TextDecoder().decode(out.stderr);
    if (!out.success) throw new Error(stderr || stdout);
    assertStringIncludes(stdout, "a/b");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("parseArgs --entry needs a value", () => {
  assertThrows(() => parseArgs(["--entry"]), Error, "--entry needs a value");
});
