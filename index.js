/**
 * dsh-claude-skills — the same repository, installable as a DSH plugin.
 *
 * The pack is primarily a folder of portable `SKILL.md` files for Claude Code,
 * the Claude apps, the Agent SDK, Cursor, Copilot and any AGENTS.md-reading
 * agent. DSH can also mount it as a plugin, but only when the package declares
 * a bundle: without `dsh.bundle.patch` the installer reports
 * "This package declares no bundle, so it cannot be managed as a plugin".
 *
 * This entry point registers every `skills/<name>/SKILL.md` with the skill's own
 * directory as the resource base, so a body that cites `references/...` resolves
 * as written. `scripts/build-adapters.mjs` continues to generate the
 * non-DSH adapters from the same files, so there is one source of truth.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const name = "dsh-claude-skills";
export const inject = ["skills"];

const ROOT = fileURLToPath(new URL("./", import.meta.url));
const SKILLS_DIR = join(ROOT, "skills");

/** Read `name` and `description` from a leading YAML frontmatter block. */
function parseFrontmatter(text) {
  const body = text.replace(/^\uFEFF/, "");
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(body);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  if (!fields.name || !fields.description) return null;
  return { ...fields, body: body.slice(match[0].length) };
}

/** Every `skills/<name>/SKILL.md` with valid frontmatter. Exported for the install check. */
export function collectSkills() {
  if (!existsSync(SKILLS_DIR)) return [];
  const out = [];
  for (const entry of readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(SKILLS_DIR, entry.name);
    const file = join(dir, "SKILL.md");
    if (!existsSync(file)) continue;
    const parsed = parseFrontmatter(readFileSync(file, "utf8"));
    if (!parsed) {
      throw new Error(`dsh-claude-skills: skills/${entry.name}/SKILL.md has no name/description frontmatter`);
    }
    if (parsed.name !== entry.name) {
      throw new Error(`dsh-claude-skills: skills/${entry.name}/SKILL.md declares name "${parsed.name}"`);
    }
    out.push({ dir, ...parsed });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function apply(ctx) {
  for (const skill of collectSkills()) {
    ctx.effect(() =>
      ctx.skills.register({
        name: skill.name,
        description: skill.description,
        whenToUse: skill.description,
        source: "dsh-claude-skills",
        resourceBase: { kind: "directory", path: skill.dir },
        content: skill.body,
      }),
    );
  }
}
