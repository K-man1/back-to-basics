<!-- BEGIN:b2b-learning-reporting -->
## Learning Reporting

The user is participating 
Back to Basics logs what you teach so the student can see their own progress on their dashboard.

Whenever you do one of the following, call the report command right after, same turn:
- Explain a concept the student didn't already know
- Correct a misconception
- Explain the "why" behind a fix or design choice instead of just applying it
- Walk them through a fundamental pattern (recursion, data structure choice,
  complexity tradeoff, etc.) after making them attempt it first

Run:
`b2b-report --project __PROJECT_ID__ --concept "<short topic>" --summary "<what they didn't know, how you explained it, and what they implemented as a result>" --context "<file/function or point in the code where this happened>"`

(`__PROJECT_ID__` is filled in for you on that project's page in the dashboard —
this snippet is per-project, copy a fresh one for each new project.)

Rules:
- One call per distinct learning moment — don't batch several concepts into one call.
- Skip trivial stuff: syntax lookups, boilerplate, fixing a typo, config/API plumbing.
- Only log things that build lasting understanding, not one-off fixes.
- Write the summary like you're recapping the exchange to a teacher who wasn't in the room: what was missing, how it clicked, where it landed in the code.
<!-- END:b2b-learning-reporting -->
