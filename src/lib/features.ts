// Feature flags.
//
// AI_PLUGIN_ENABLED gates the `ai-attribution` Claude Code plugin end to end:
// the /editors setup page, the "AI apps" card in Settings, the new-student
// redirect into the picker, the AI Usage repo picker on the project form, the
// "AI usage" submit requirement, and every /api/attribution/* route.
//
// The plugin's code (src/lib/attribution.ts, src/lib/editors.ts, the API
// routes, the components) is all still here and still compiles — flipping this
// to `true` brings the whole feature back with no other edits. The database
// tables in supabase/schema.sql are likewise left in place, so existing rows
// survive the feature being off.
//
// Not read from the environment on purpose: the flag decides what the Next.js
// build renders on both server and client, and a constant keeps those two in
// agreement without an env var having to be set identically everywhere.
export const AI_PLUGIN_ENABLED = false;
