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

Init pack on a connected machine. Seal the app. Copy the **app**. Run it dark.

### Init

```sh
deno run -A jsr:@decomm/pack/init ./pack
cd pack
deno task compile
```

Or from this repo: `deno task compile`. That leaves `bin/pack`.

### Seal (still connected)

```sh
./pack.sh seal ./my-app
./pack.sh seal ./my-app --entry main.ts
```

That writes `vendor/` and `deno.lock` into `my-app`. Pack itself can stay home.

### Copy

Carry the **app** folder onto the isolated box — USB, sneakernet,
[ferry](https://github.com/decomm-tools/ferry). Include `vendor/` and `deno.lock`.

### Run dark

No network. The box never needs to come back online.

```sh
cd my-app
deno run --cached-only main.ts
```

`pack.sh` uses the compiled pack CLI if present, otherwise `deno run`. That binary is the tool, not
the app. The isolated box does not need Deno if you compiled the _app_ yourself.
