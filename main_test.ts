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

Deno.test("parseArgs --entry needs a value", () => {
  assertThrows(() => parseArgs(["--entry"]), Error, "--entry needs a value");
});
