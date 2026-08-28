import { assertEquals, assertRejects } from "@std/assert";
import { init } from "./init.ts";

const FILES = ["main.ts", "args.ts", "seal.ts", "pack.sh", "deno.json", "README.md", "LICENSE"];

Deno.test("init copies the self-contained tree", async () => {
  const dir = await Deno.makeTempDir({ prefix: "decomm-pack-init-" });
  try {
    await init(dir, { force: true });
    for (const name of FILES) {
      const st = await Deno.stat(`${dir}/${name}`);
      assertEquals(st.isFile, true);
    }
    const sh = await Deno.stat(`${dir}/pack.sh`);
    assertEquals((sh.mode ?? 0) & 0o111, 0o111);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("init refuses a non-empty directory without force", async () => {
  const dir = await Deno.makeTempDir({ prefix: "decomm-pack-init-full-" });
  try {
    await Deno.writeTextFile(`${dir}/keep.txt`, "x\n");
    await assertRejects(() => init(dir), Error, "Directory is not empty");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
