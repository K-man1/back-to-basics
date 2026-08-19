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
// `perProject` marks a tool that cannot be wired up machine-wide, so
// install-hooks has to be re-run in each repo. Everything else installs once
// and covers every project. Kept in sync by hand with the `user`/`user_dirs`
// keys in core/adapters.py, where the reason for each is documented.
export interface EditorTool {
  label: string;
  slug: string;
  logo: string;
  supported: boolean;
  install: "claude-plugin" | "standalone";
  perProject?: boolean;
  note?: string;
}

export const EDITOR_TOOLS: EditorTool[] = [
  {
    label: "Claude Code", slug: "claude-code", logo: "claude.png",
    supported: true, install: "claude-plugin",
  },
  { label: "Cursor", slug: "cursor", logo: "cursor.png", supported: true, install: "standalone" },
  { label: "Windsurf", slug: "windsurf", logo: "windsurf.png", supported: true, install: "standalone" },
  { label: "Antigravity", slug: "antigravity", logo: "antigravity.png", supported: true, install: "standalone" },
  {
    label: "Kiro", slug: "kiro", logo: "kiro.png", supported: true, install: "standalone",
    perProject: true,
    note: "Kiro only reads machine-wide hooks in its v3 CLI (early access) — "
      + "the IDE has an open bug for it — so this is set up per project. "
      + "Its exact hook payload isn't published either, so if edits never show "
      + "up under Projects, re-run the command with AIATTR_DEBUG=1 set.",
  },
  { label: "Qoder", slug: "qoder", logo: "qoder.png", supported: true, install: "standalone" },
  {
    label: "Devin", slug: "devin", logo: "devin.png", supported: true, install: "standalone",
    note: "CLI only -- Devin's default cloud sessions have no local hook to attach to.",
  },
  { label: "Codex", slug: "codex", logo: "codex.png", supported: true, install: "standalone" },
  { label: "Gemini CLI", slug: "gemini-cli", logo: "gemini-cli.png", supported: true, install: "standalone" },
  {
    label: "OpenCode", slug: "opencode", logo: "opencode.png", supported: true, install: "standalone",
    note: "Restart opencode when this finishes. It has no hook config file — "
      + "this installs a plugin into ~/.config/opencode/plugins/ instead, and "
      + "opencode only loads plugins at startup, so nothing is recorded until "
      + "you restart it.",
  },
  { label: "Goose", slug: "goose", logo: "goose.png", supported: true, install: "standalone" },
  { label: "Qwen Code", slug: "qwen-code", logo: "qwen.png", supported: true, install: "standalone" },
  { label: "GitHub Copilot CLI", slug: "github-copilot-cli", logo: "copilot.png", supported: true, install: "standalone" },
  { label: "Cline", slug: "cline", logo: "cline.png", supported: true, install: "standalone" },
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
//
// The interpreter is discovered rather than hardcoded to `python3`, because
// plenty of machines (Windows especially, where `python3` is often the
// Microsoft Store stub) only have a working Python 3 under the name `python`.
// Standalone installs do not need this -- install.sh writes a launcher that
// resolves the interpreter once, which is why those commands are one-liners.
const CLAUDE_PLUGIN_CLI =
  '$(command -v python3 || command -v python) ' +
  '"$(ls -d ~/.claude/plugins/cache/ai-attribution-marketplace/ai-attribution/*/ ' +
  '| sort -V | tail -1)cli/aiattr.py"';

// The launcher install.sh writes. Fixed path with no glob: install.sh always
// replaces the same directory on re-run, so this never resolves to two things.
const STANDALONE_CLI = '"$HOME/.ai-attribution/bin/aiattr"';

/**
 * The commands a student runs for one tool.
 *
 * `key` carries the whole "which computer is this" decision. A plaintext key
 * exists only when one was just issued, which happens in exactly two cases:
 * the student has never set up at all, or they explicitly asked for a new
 * computer. Both need the full install. When it is null, the student already
 * has a working machine and is only adding another app to it -- the plugin and
 * their key are already on disk, so re-running the installer would be noise.
 * That is why the short list is the default rather than something to opt into.
 */
export interface SetupCommand {
  cmd: string;
  // Shown under the command. Only present where running it in the wrong place
  // silently does nothing, which is the one mistake this flow cannot detect.
  hint?: string;
}

export function buildSetupCommands(
  tool: EditorTool,
  opts: { key: string | null; origin: string },
): SetupCommand[] {
  if (tool.install === "claude-plugin") {
    // Claude Code registers the plugin's hooks itself on install, so there is
    // never an install-hooks step here.
    const commands: SetupCommand[] = [
      { cmd: `claude plugin marketplace add ${ATTRIBUTION_MARKETPLACE_URL}` },
      {
        cmd: "claude plugin install ai-attribution@ai-attribution-marketplace --scope user",
      },
    ];
    if (opts.key) {
      commands.push({
        cmd: `${CLAUDE_PLUGIN_CLI} configure --key ${opts.key} --endpoint ${opts.origin} --enable-hackatime`,
        hint: "Connects it to your account. Restart Claude Code afterwards.",
      });
    } else {
      // The short path, and the only one of the two that can be silently wrong.
      // Every other short path ends in `install-hooks`, which fails loudly on a
      // machine that never ran the installer. These two commands succeed just
      // fine on a machine with no key on disk, and the plugin they install then
      // tracks locally and sends nothing, forever, without complaining once.
      // `status` is the only thing on this path that can tell the two apart, so
      // it is a step rather than a suggestion.
      commands[commands.length - 1].hint = "Restart Claude Code afterwards.";
      commands.push({
        cmd: `${CLAUDE_PLUGIN_CLI} status`,
        hint:
          "Checks this computer is connected. It must say `reporting: on` — "
          + "if it says off, this is a computer you have not set up before, so "
          + "use the link below.",
      });
    }
    return commands;
  }

  if (!tool.supported) return [];

  // First-time setup on a machine is a single command: install.sh takes the
  // key and the tool name, so it downloads, connects to the account, and wires
  // the hooks up in one go. The student never copies a key between commands
  // and never types an interpreter name.
  //
  // --tool is only folded in for tools that install machine-wide. For the rest
  // install.sh would be running install-hooks from the home directory, which
  // is not a project -- the CLI refuses that outright rather than writing a
  // config nothing reads, so those get their own command with a `cd` to do.
  if (opts.key) {
    const first: SetupCommand = {
      cmd:
        `curl -fsSL ${ATTRIBUTION_INSTALL_SCRIPT_URL} | sh -s -- ` +
        `--key ${opts.key} --endpoint ${opts.origin}` +
        (tool.perProject ? "" : ` --tool ${tool.slug}`),
      hint: tool.perProject
        ? "Installs it and connects it to your account."
        : `That is the whole setup — every project on this computer is covered.`,
    };
    if (!tool.perProject) return [first];
    return [
      first,
      {
        cmd: `${STANDALONE_CLI} install-hooks ${tool.slug}`,
        hint: `${tool.label} has no machine-wide hook setting, so this covers one project. Run it inside each project folder you build in.`,
      },
    ];
  }

  // Already set up on this machine, just adding another app.
  const command: SetupCommand = {
    cmd: `${STANDALONE_CLI} install-hooks ${tool.slug}`,
  };
  if (tool.perProject) {
    command.hint =
      `${tool.label} has no machine-wide hook setting, so this covers one project. Run it inside each project folder you build in.`;
  }
  return [command];
}
