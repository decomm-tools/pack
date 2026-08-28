# decomm pack

Seal a Deno project so it runs after the cable comes out. Sets `"vendor": true`, runs
`deno install --entrypoint`, and leaves `vendor/` plus `deno.lock` in the app folder. Copy that
folder onto the isolated box and run with `--cached-only`.

This is **not** Deno's `pack` command. Deno pack builds npm tarballs. This tool vendors a Deno graph
so the far side never has to fetch.

## Commands

| Command       | What                                                  |
| ------------- | ----------------------------------------------------- |
| `seal <dir>`  | Write `vendor: true`, run `deno install --entrypoint` |
| `check <dir>` | Fail if the project still needs the network           |

`--entry` picks the file to install. Without it, pack uses `exports["."]` in `deno.json`, then
`main.ts`, then `mod.ts`.

## Carry-in

```sh
deno run -A jsr:@decomm/pack/init ./pack
cd pack
deno task compile
./pack.sh seal ./my-app
```

Or from this repo, on a connected machine:

```sh
deno task compile
./pack.sh seal ./my-app
./pack.sh seal ./my-app --entry main.ts
./pack.sh check ./my-app
```

Copy the **app** folder, including `vendor/` and `deno.lock`, onto the isolated box.

```sh
deno run --cached-only main.ts
```

`pack.sh` runs the compiled pack CLI if it exists, otherwise `deno run`. That binary is the tool,
not the app. The isolated box does not need Deno if you compiled the _app_ yourself.
