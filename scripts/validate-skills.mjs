#!/usr/bin/env node
/**
 * Validate the skill pack against the Agent Skills contract.
 *
 * Checks (all must pass; warnings never fail the run):
 *   E1  skills/<dir>/SKILL.md exists and starts with `---` at byte 0 (no BOM)
 *   E2  frontmatter declares `name` and `description`
 *   E3  name matches ^[a-z0-9-]{1,64}$ and equals the directory name
 *   E4  description length <= 1024 characters
 *   E5  body is non-empty and cites no absolute path (C:\ / /home/ / /Users/)
 *   E6  every `references/...` path cited in the body resolves inside the skill dir
 *   E7  adapters/ is current (delegates to build-adapters.mjs --check)
 *   E8  README and INSTALL quote the real skill count
 *   W1  SKILL.md over 500 lines (Claude's progressive-disclosure guidance)
 *   W2  a skill directory with no SKILL.md
 *
 * Usage: node scripts/validate-skills.mjs
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(root, "skills");
const errors = [];
const warnings = [];
const fail = (id, msg) => errors.push(`${id} ${msg}`);
const warn = (id, msg) => warnings.push(`${id} ${msg}`);

function readFrontmatter(raw) {
  const text = raw.replace(/^\uFEFF/, "");
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const block = text.slice(3, end);
  const body = text.slice(end + 4);
  const fm = {};
  for (const line of block.split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return { fm, body };
}

const dirs = readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
let skillCount = 0;

for (const dir of dirs) {
  const file = join(skillsDir, dir, "SKILL.md");
  if (!existsSync(file)) {
    warn("W2", `skills/${dir} has no SKILL.md`);
    continue;
  }
  skillCount++;
  const raw = readFileSync(file, "utf8");
  const bytes = readFileSync(file);

  // E1 — BOM
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("E1", `skills/${dir}/SKILL.md starts with a UTF-8 BOM; YAML frontmatter must start at byte 0`);
  }
  const parsed = readFrontmatter(raw);
  if (!parsed) {
    fail("E1", `skills/${dir}/SKILL.md has no parseable frontmatter block`);
    continue;
  }
  const { fm, body } = parsed;

  // E2
  if (!fm.name) fail("E2", `skills/${dir}: frontmatter has no name`);
  if (!fm.description) fail("E2", `skills/${dir}: frontmatter has no description`);
  // A colon followed by a space ends an unquoted YAML scalar early and the loader
  // drops the skill entirely - this is how game-design vanished from the catalog.
  if (fm.description && /:\s/.test(fm.description)) fail("E2b", `skills/${dir}: description contains a colon-space and breaks the YAML scalar`);

  // E3
  if (fm.name) {
    if (!/^[a-z0-9-]{1,64}$/.test(fm.name)) {
      fail("E3", `skills/${dir}: name "${fm.name}" must be lowercase letters, digits and hyphens, 1-64 chars`);
    }
    if (fm.name !== dir) {
      fail("E3", `skills/${dir}: name "${fm.name}" does not match the directory name`);
    }
  }

  // E4
  if (fm.description && fm.description.length > 1024) {
    fail("E4", `skills/${dir}: description is ${fm.description.length} chars, limit is 1024`);
  }

  // E5
  if (!body.trim()) fail("E5", `skills/${dir}: body is empty`);
  // Strip URLs first: "https://docs.arc42.org/home/" is not an absolute machine path.
  const withoutUrls = body.replace(/https?:\/\/\S+/g, "");
  const abs = /[A-Za-z]:\\|\/home\/|\/Users\/|\/mnt\/c\//.exec(withoutUrls);
  if (abs) {
    fail("E5", `skills/${dir}: body cites an absolute path (${abs[0]})`);
  }

  // E6
  const cited = [...body.matchAll(/references[\\/][A-Za-z0-9_./\\-]+\.md/g)].map((m) => m[0].replace(/\\/g, "/"));
  for (const rel of new Set(cited)) {
    if (!existsSync(join(skillsDir, dir, rel))) {
      fail("E6", `skills/${dir}: cited path "${rel}" does not exist`);
    }
  }

  // W1
  const lines = body.split(/\r?\n/).length;
  if (lines > 500) {
    warn("W1", `skills/${dir}/SKILL.md body is ${lines} lines; the guidance is under 500, move detail into references/`);
  }
}

// E7 — adapters current
try {
  execFileSync(process.execPath, [join(root, "scripts", "build-adapters.mjs"), "--check"], { stdio: "pipe" });
} catch (e) {
  fail("E7", `adapters are stale — run: node scripts/build-adapters.mjs\n${e.stderr?.toString?.() ?? ""}`);
}

// E8 — documented count
for (const doc of ["README.md", "INSTALL.md"]) {
  const path = join(root, doc);
  if (!existsSync(path)) {
    fail("E8", `${doc} is missing`);
    continue;
  }
  const text = readFileSync(path, "utf8");
  const numbers = new Set([...text.matchAll(/\b(\d{1,3})\s+(?:portable\s+)?(?:agent\s+)?skills\b/gi)].map((m) => Number(m[1])));
  for (const m of text.matchAll(/\*\*(\d{1,3})\*\*\s+skills/gi)) numbers.add(Number(m[1]));
  for (const n of numbers) {
    if (n !== skillCount) fail("E8", `${doc} says ${n} skills, the pack has ${skillCount}`);
  }
}

// Report
console.log(`Checked ${skillCount} skills in ${skillsDir}\n`);
if (warnings.length) {
  console.log(`WARNINGS (${warnings.length})`);
  for (const w of warnings) console.log(`  ${w}`);
  console.log("");
}
if (errors.length) {
  console.log(`ERRORS (${errors.length})`);
  for (const e of errors) console.log(`  ${e}`);
  console.log(`\nFAIL`);
  process.exit(1);
}
console.log("PASS — 0 errors");
if (warnings.length) console.log(`(${warnings.length} warning(s), non-blocking)`);
