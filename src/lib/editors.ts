// The AI coding apps a student can set up. Logos live at /logos/{logo}.
//
// `supported` reflects whether the ai-attribution plugin (b2b-hook) actually
// has a hook adapter for this tool -- see core/adapters.py there, which this
// list is kept in sync with by hand. `note` explains a caveat or, for an
// unsupported tool, why: these are short versions of the reasons documented
// in that module, not guesses made here.
//
// `install` is "claude-plugin" only for Claude Code itself, whose hooks fire
// automatically the moment `claude plugin install` runs -- no separate
// install-hooks step exists or is needed for it. Every other tool is
// "standalone": getting the plugin's files onto disk cannot depend on the
// student already having Claude Code installed (most of them will not), so
// those go through install.sh instead and then run install-hooks themselves.
export interface EditorTool {
  label: string;
  slug: string;
  logo: string;
  supported: boolean;
  install: "claude-plugin" | "standalone";
  note?: string;
}

export const EDITOR_TOOLS: EditorTool[] = [
  {
    label: "Claude Code", slug: "claude-code", logo: "claude.png",
    supported: true, install: "claude-plugin",
  },
  { label: "Cursor", slug: "cursor", logo: "cursor.png", supported: true, install: "standalone" },
  { label: "Windsurf", slug: "windsurf", logo: "windsurf.png", supported: true, install: "standalone" },
  {
    label: "Trae", slug: "trae", logo: "trae.png", supported: false, install: "standalone",
    note: "Trae has no hook mechanism yet (open, unimplemented feature request).",
  },
  { label: "Antigravity", slug: "antigravity", logo: "antigravity.png", supported: true, install: "standalone" },
  {
    label: "Kiro", slug: "kiro", logo: "kiro.png", supported: true, install: "standalone",
    note: "Kiro's exact hook payload isn't published, so this is best-effort. "
      + "If edits never show up under Projects, run the install-hooks command "
      + "again with AIATTR_DEBUG=1 set and check the output.",
  },
  { label: "Qoder", slug: "qoder", logo: "qoder.png", supported: true, install: "standalone" },
  {
    label: "Devin", slug: "devin", logo: "devin.png", supported: true, install: "standalone",
    note: "CLI only -- Devin's default cloud sessions have no local hook to attach to.",
  },
  {
    label: "VSCodium", slug: "vscodium", logo: "vscodium.png", supported: false, install: "standalone",
    note: "VSCodium is an editor, not an agent. Set up whichever AI extension "
      + "you run inside it (Cline, Copilot, ...) using its own entry on this page.",
  },
  {
    label: "code-server", slug: "code-server", logo: "code-server.png", supported: false, install: "standalone",
    note: "code-server is a host, not an agent. Set up whichever AI extension "
      + "you run inside it using its own entry on this page.",
  },
  { label: "Codex", slug: "codex", logo: "codex.png", supported: true, install: "standalone" },
  { label: "Gemini CLI", slug: "gemini-cli", logo: "gemini-cli.png", supported: true, install: "standalone" },
  {
    label: "OpenCode", slug: "opencode", logo: "opencode.png", supported: false, install: "standalone",
    note: "opencode's hooks are real TypeScript plugin code, not a config file "
      + "we can generate. Not supported yet.",
  },
  { label: "Goose", slug: "goose", logo: "goose.png", supported: true, install: "standalone" },
  { label: "Qwen Code", slug: "qwen-code", logo: "qwen.png", supported: true, install: "standalone" },
  {
    label: "Amp", slug: "amp", logo: "amp.png", supported: false, install: "standalone",
    note: "Amp has no declarative shell-command hook; reaching one means "
      + "writing a JS plugin. Not supported yet.",
  },
  { label: "GitHub Copilot CLI", slug: "github-copilot-cli", logo: "copilot.png", supported: true, install: "standalone" },
  { label: "Cline", slug: "cline", logo: "cline.png", supported: true, install: "standalone" },
  {
    label: "Roo Code", slug: "roo-code", logo: "roo-code.png", supported: false, install: "standalone",
    note: "Roo Code's hooks are an open, unmerged feature request. Not supported yet.",
  },
  { label: "GitHub Copilot", slug: "github-copilot", logo: "copilot.png", supported: true, install: "standalone" },
  {
    label: "Cody", slug: "cody", logo: "cody.png", supported: false, install: "standalone",
    note: "No hook mechanism found in Cody's current docs. Not supported yet.",
  },
];

export const ATTRIBUTION_MARKETPLACE_URL =
  process.env.NEXT_PUBLIC_ATTRIBUTION_MARKETPLACE_URL ??
  "https://github.com/K-man1/b2b-hook.git";

export const ATTRIBUTION_INSTALL_SCRIPT_URL =
  process.env.NEXT_PUBLIC_ATTRIBUTION_INSTALL_SCRIPT_URL ??
  "https://raw.githubusercontent.com/K-man1/b2b-hook/main/install.sh";

// Resolves to the newest cached copy of the plugin. `sort -V | tail -1`
// matters, not decoration: after an update, Claude Code can leave an older
// version's directory behind alongside the new one, and a bare `*/` glob then
// expands to more than one path -- which breaks whatever command follows it,
// silently, well after setup. This is the one form that stays correct across
// an update.
const CLAUDE_PLUGIN_CLI =
  '"$(ls -d ~/.claude/plugins/cache/ai-attribution-marketplace/ai-attribution/*/ ' +
  '| sort -V | tail -1)cli/aiattr.py"';

// install.sh always replaces the same fixed directory on re-run (see its own
// comment for why), so there is no multi-version glob hazard here at all --
// this path never has more than one thing it could resolve to.
const STANDALONE_CLI = '"$HOME/.ai-attribution/plugin/cli/aiattr.py"';

/**
 * The commands a student runs for one tool. `key` is only passed when a fresh
 * plaintext key was just issued this session -- otherwise the configure line
 * is omitted rather than showing a stale or fake value, because printing a
 * key we do not actually have would be worse than not printing one.
 */
export function buildSetupCommands(
  tool: EditorTool,
  opts: { key: string | null; origin: string },
): string[] {
  if (tool.install === "claude-plugin") {
    const commands = [
      `claude plugin marketplace add ${ATTRIBUTION_MARKETPLACE_URL}`,
      "claude plugin install ai-attribution@ai-attribution-marketplace --scope user",
    ];
    if (opts.key) {
      commands.push(
        `python3 ${CLAUDE_PLUGIN_CLI} configure --key ${opts.key} --endpoint ${opts.origin} --enable-hackatime`,
      );
    }
    return commands;
  }

  const commands = [`curl -fsSL ${ATTRIBUTION_INSTALL_SCRIPT_URL} | sh`];
  if (opts.key) {
    commands.push(
      `python3 ${STANDALONE_CLI} configure --key ${opts.key} --endpoint ${opts.origin} --enable-hackatime`,
    );
  }
  if (tool.supported) {
    commands.push(`python3 ${STANDALONE_CLI} install-hooks ${tool.slug}`);
  }
  return commands;
}
