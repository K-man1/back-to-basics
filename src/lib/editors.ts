// The AI coding apps a student can set up. Logos live at /logos/{logo}.
//
// `supported` reflects whether the ai-attribution plugin (b2b-hook) actually
// has a hook adapter for this tool -- see core/adapters.py there, which this
// list is kept in sync with by hand. `note` explains a caveat or, for an
// unsupported tool, why: these are short versions of the reasons documented
// in that module, not guesses made here.
export interface EditorTool {
  label: string;
  slug: string;
  logo: string;
  supported: boolean;
  note?: string;
}

export const EDITOR_TOOLS: EditorTool[] = [
  { label: "Cursor", slug: "cursor", logo: "cursor.png", supported: true },
  { label: "Windsurf", slug: "windsurf", logo: "windsurf.png", supported: true },
  {
    label: "Trae", slug: "trae", logo: "trae.png", supported: false,
    note: "Trae has no hook mechanism yet (open, unimplemented feature request).",
  },
  { label: "Antigravity", slug: "antigravity", logo: "antigravity.png", supported: true },
  {
    label: "Kiro", slug: "kiro", logo: "kiro.png", supported: true,
    note: "Kiro's exact hook payload isn't published, so this is best-effort. "
      + "If edits never show up under Projects, run the install-hooks command "
      + "again with AIATTR_DEBUG=1 set and check the output.",
  },
  { label: "Qoder", slug: "qoder", logo: "qoder.png", supported: true },
  { label: "Devin", slug: "devin", logo: "devin.png", supported: true,
    note: "CLI only -- Devin's default cloud sessions have no local hook to attach to." },
  {
    label: "VSCodium", slug: "vscodium", logo: "vscodium.png", supported: false,
    note: "VSCodium is an editor, not an agent. Set up whichever AI extension "
      + "you run inside it (Cline, Copilot, ...) using its own entry on this page.",
  },
  {
    label: "code-server", slug: "code-server", logo: "code-server.png", supported: false,
    note: "code-server is a host, not an agent. Set up whichever AI extension "
      + "you run inside it using its own entry on this page.",
  },
  { label: "Codex", slug: "codex", logo: "codex.png", supported: true },
  { label: "Gemini CLI", slug: "gemini-cli", logo: "gemini-cli.png", supported: true },
  {
    label: "OpenCode", slug: "opencode", logo: "opencode.png", supported: false,
    note: "opencode's hooks are real TypeScript plugin code, not a config file "
      + "we can generate. Not supported yet.",
  },
  { label: "Goose", slug: "goose", logo: "goose.png", supported: true },
  { label: "Qwen Code", slug: "qwen-code", logo: "qwen.png", supported: true },
  {
    label: "Amp", slug: "amp", logo: "amp.png", supported: false,
    note: "Amp has no declarative shell-command hook; reaching one means "
      + "writing a JS plugin. Not supported yet.",
  },
  { label: "GitHub Copilot CLI", slug: "github-copilot-cli", logo: "copilot.png", supported: true },
  { label: "Cline", slug: "cline", logo: "cline.png", supported: true },
  {
    label: "Roo Code", slug: "roo-code", logo: "roo-code.png", supported: false,
    note: "Roo Code's hooks are an open, unmerged feature request. Not supported yet.",
  },
  { label: "GitHub Copilot", slug: "github-copilot", logo: "copilot.png", supported: true },
  {
    label: "Cody", slug: "cody", logo: "cody.png", supported: false,
    note: "No hook mechanism found in Cody's current docs. Not supported yet.",
  },
];

export const ATTRIBUTION_MARKETPLACE_URL =
  process.env.NEXT_PUBLIC_ATTRIBUTION_MARKETPLACE_URL ??
  "https://github.com/K-man1/b2b-hook.git";

// Resolves to the newest cached copy of the plugin. `sort -V | tail -1`
// matters, not decoration: after an update, Claude Code can leave an older
// version's directory behind alongside the new one, and a bare `*/` glob then
// expands to more than one path -- which breaks whatever command follows it,
// silently, well after setup. This is the one form that stays correct across
// an update.
const AIATTR_CLI =
  '"$(ls -d ~/.claude/plugins/cache/ai-attribution-marketplace/ai-attribution/*/ ' +
  '| sort -V | tail -1)cli/aiattr.py"';

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
  const commands = [
    `claude plugin marketplace add ${ATTRIBUTION_MARKETPLACE_URL}`,
    "claude plugin install ai-attribution@ai-attribution-marketplace --scope user",
  ];
  if (opts.key) {
    commands.push(
      `python3 ${AIATTR_CLI} configure --key ${opts.key} --endpoint ${opts.origin}`,
    );
  }
  if (tool.supported) {
    commands.push(`python3 ${AIATTR_CLI} install-hooks ${tool.slug}`);
  }
  return commands;
}
