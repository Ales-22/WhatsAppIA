import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const cacheDir =
  process.env.PUPPETEER_CACHE_DIR || path.join(process.cwd(), ".cache", "puppeteer");
fs.mkdirSync(cacheDir, { recursive: true });

console.log("Using PUPPETEER_CACHE_DIR:", cacheDir);

execSync("npx puppeteer browsers install chrome", {
  stdio: "inherit",
  env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir }
});