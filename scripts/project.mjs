import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const website = path.join(root, "coffee-court");
const admin = path.join(root, "lost-origin-admin");
const communications = path.join(website, "services/communications");
function run(cwd, executable, args, extraEnv = {}) {
  const result = spawnSync(executable, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
function npm(cwd, args, extraEnv) {
  if (!process.env.npm_execpath)
    throw new Error("Run this command through npm.");
  run(cwd, process.execPath, [process.env.npm_execpath, ...args], extraEnv);
}
switch (process.argv[2]) {
  case "install":
    npm(website, ["run", "install:ci"]);
    npm(communications, ["ci", "--omit=optional"], {
      PUPPETEER_SKIP_DOWNLOAD: "true",
    });
    break;
  case "build":
    npm(website, ["run", "build"]);
    npm(admin, ["run", "build"]);
    for (const file of ["server.mjs", "core.mjs"])
      run(root, process.execPath, ["--check", path.join(communications, file)]);
    break;
  case "typecheck":
    npm(website, ["run", "typecheck"]);
    break;
  case "test":
    npm(website, ["test"]);
    npm(communications, ["test"]);
    break;
  case "dev":
    npm(website, ["run", "dev:all"]);
    break;
  case "migrate": {
    const builtConfig = path.join(website, "dist/server/wrangler.json");
    if (!existsSync(builtConfig))
      throw new Error("Run npm run build before applying local migrations.");
    const config = JSON.parse(readFileSync(builtConfig, "utf8"));
    const runtime = path.join(website, ".sites-runtime");
    mkdirSync(runtime, { recursive: true });
    const migrationConfig = path.join(
      runtime,
      "local-migrations.wrangler.json",
    );
    writeFileSync(
      migrationConfig,
      JSON.stringify(
        {
          name: config.name,
          compatibility_date: config.compatibility_date,
          d1_databases: config.d1_databases.map((database) => ({
            ...database,
            migrations_dir: path.join(website, "drizzle"),
          })),
        },
        null,
        2,
      ),
    );
    run(
      website,
      process.execPath,
      [
        "--import",
        "./scripts/sites-env.mjs",
        "./node_modules/wrangler/bin/wrangler.js",
        "d1",
        "migrations",
        "apply",
        "DB",
        "--local",
        "--config",
        migrationConfig,
        "--persist-to",
        ".wrangler/state",
      ],
      { CI: "1" },
    );
    break;
  }
  default:
    throw new Error("Unknown project command.");
}
