import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { run } from "./main.ts";
import { resolveEntry } from "./seal.ts";

const write = async (dir: string, name: string, text: string) => {
  await Deno.writeTextFile(`${dir}/${name}`, text);
};

Deno.test("seal local project and check", async () => {
  const dir = await Deno.makeTempDir({ prefix: "decomm-pack-local-" });
  try {
    await write(dir, "main.ts", "export const ping = () => 1;\n");
    const out = await run(["seal", dir]);
    assertStringIncludes(out, dir);
    assertStringIncludes(out, "entry: main.ts");
    assertStringIncludes(out, "vendor/");
    assertStringIncludes(out, "cached-only");
    const cfg = JSON.parse(await Deno.readTextFile(`${dir}/deno.json`));
    assertEquals(cfg.vendor, true);
    assertEquals(await run(["check", dir]), "ok\n");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("seal preserves deno.json fields", async () => {
  const dir = await Deno.makeTempDir({ prefix: "decomm-pack-merge-" });
  try {
    await Deno.mkdir(`${dir}/src`);
    await write(dir, "src/app.ts", "export const n = 1;\n");
    await write(
      dir,
      "deno.json",
      JSON.stringify(
        {
          tasks: { start: "deno run src/app.ts" },
          imports: { "@std/path": "jsr:@std/path@^1.0.0" },
          exports: { ".": "./src/app.ts" },
        },
        null,
        2,
      ),
    );
    const out = await run(["seal", dir]);
    assertStringIncludes(out, "entry: ./src/app.ts");
    const cfg = JSON.parse(await Deno.readTextFile(`${dir}/deno.json`));
    assertEquals(cfg.vendor, true);
    assertEquals(cfg.tasks, { start: "deno run src/app.ts" });
    assertEquals((cfg.imports as Record<string, string>)["@std/path"], "jsr:@std/path@^1.0.0");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("seal vendors a jsr import", async () => {
  const dir = await Deno.makeTempDir({ prefix: "decomm-pack-jsr-" });
  try {
    await write(
      dir,
      "main.ts",
      'import { join } from "jsr:@std/path@1";\nconsole.log(join("a", "b"));\n',
    );
    const out = await run(["seal", dir]);
    assertStringIncludes(out, "Sealed");
    const vendor = `${dir}/vendor`;
    const st = await Deno.stat(vendor);
    assertEquals(st.isDirectory, true);
    await Deno.stat(`${dir}/deno.lock`);
    assertEquals(await run(["check", dir]), "ok\n");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("seal fails without an entrypoint", async () => {
  const dir = await Deno.makeTempDir({ prefix: "decomm-pack-empty-" });
  try {
    await assertRejects(() => run(["seal", dir]), Error, "No entrypoint");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("check fails when the graph is not cached", async () => {
  const dir = await Deno.makeTempDir({ prefix: "decomm-pack-miss-" });
  try {
    await write(dir, "main.ts", 'import "https://localhost:1/not-cached.ts";\n');
    await assertRejects(() => run(["check", dir]), Error);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("resolveEntry prefers --entry then main then mod", async () => {
  const dir = await Deno.makeTempDir({ prefix: "decomm-pack-entry-" });
  try {
    await write(dir, "mod.ts", "export const m = 1;\n");
    assertEquals(await resolveEntry(dir), "mod.ts");
    await write(dir, "main.ts", "export const n = 1;\n");
    assertEquals(await resolveEntry(dir), "main.ts");
    assertEquals(await resolveEntry(dir, "mod.ts"), "mod.ts");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
