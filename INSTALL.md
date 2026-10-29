# Install

Pick the section for your tool. Nothing here installs a dependency; the skills are markdown files.

## Claude Code

**Per project** — scoped to one repository:

```
<project>/.claude/skills/<skill-name>/SKILL.md
```

**Per user** — available in every project:

```
%USERPROFILE%\.claude\skills\<skill-name>\SKILL.md      # Windows
~/.claude/skills/<skill-name>/SKILL.md                  # macOS / Linux
```

```powershell
# Windows: copy all 41
Copy-Item -Recurse skills\* "$env:USERPROFILE\.claude\skills\"
```

Restart Claude Code (or start a new session). Verify with `/skills` or by asking it to list the available skills — it should report 41.

Also copy `adapters/CLAUDE.md` to the project root as `CLAUDE.md` if you want the routing index in project memory.

## Claude.ai / Claude Desktop

A skill must be uploaded as a **single zipped folder** containing `SKILL.md` at its root.

```powershell
# zip one skill (the folder that contains SKILL.md becomes the archive root)
Compress-Archive -Path skills\ui-design -DestinationPath ui-design.zip
```

Then: **Settings → Capabilities → Skills → Upload**, and enable it. Repeat per skill you want active. Upload only what the account needs — there is no shared install.

## Claude Agent SDK

Point the SDK's `skills` option at this repository's `skills/` directory; each subdirectory with a `SKILL.md` is discovered automatically. Ship `adapters/CLAUDE.md` alongside as agent instructions if the host supports project memory.

## Cursor

```powershell
New-Item -ItemType Directory -Force .cursor\rules | Out-Null
Copy-Item adapters\cursor-skills.mdc .cursor\rules\skills.mdc
Copy-Item -Recurse skills .cursor\skills
```

Cursor does not load `SKILL.md`; the rule file is the index and points at `skills/` inside the repository. Keep both until Cursor's skill support lands.

## GitHub Copilot

```powershell
New-Item -ItemType Directory -Force .github | Out-Null
Copy-Item adapters\copilot-instructions.md .github\copilot-instructions.md
Copy-Item -Recurse skills .github\skills
```

Copilot reads the instructions file as context, so the table is the entry point and `skills/` carries the detail.

## Codex, Gemini CLI, Aider, Zed, Cline, Roo, Windsurf

These read a repository `AGENTS.md`.

```powershell
Copy-Item adapters\AGENTS.md AGENTS.md
Copy-Item -Recurse skills skills
```

Keep the `skills/` directory next to `AGENTS.md`; the index paths are relative to it.

## Anything else

The contract is small and stable:

1. `skills/<name>/SKILL.md` starts with a `---` YAML frontmatter block containing `name` and `description`.
2. The body is markdown instructions.
3. Supporting files, if any, sit beside `SKILL.md` and are referenced by relative path.

If a tool can read a file on demand, it can use these skills. Give it `adapters/AGENTS.md` as the index and the ability to open the file a row points at.

## Verify the install

- The index lists **41** skills.
- Every `SKILL.md` starts with `---` on line 1 (no BOM — a byte-order mark breaks YAML parsing; the adapter script strips one, but some tools do not).
- A spot check: ask the agent to load `senior-code-review` and confirm it returns the procedure, not a summary.

```powershell
# frontmatter sanity across the pack
Get-ChildItem skills -Directory | ForEach-Object {
  $p = Join-Path $_.FullName 'SKILL.md'
  $b = [System.IO.File]::ReadAllBytes($p)[0..2]
  $bom = ($b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF)
  "{0,-32} {1}" -f $_.Name, $(if ($bom) { 'BOM — fix' } else { 'ok' })
}
```

## Updating

Pull this repository, then re-copy the directories you installed. For the adapters:

```bash
node scripts/build-adapters.mjs
```

## Uninstall

Delete the `<skill-name>` directory you installed (`~/.claude/skills/senior-code-review/`, `.cursor/skills/...`, and so on). Nothing registers itself globally, so removal is a directory delete.
