/**
 * Scripted conversations against the real assistant (real model, real prompt, real
 * tool code) with an in-memory activity store. Run: npm run eval:chat -- --help
 * Uses ANTHROPIC_API_KEY (and optionally CHATBOT_MODEL) from .env / .env.local.
 */
import { runAgent, type ChatTurn } from "@/lib/chatbot/agent";
import { CHATBOT_MODEL } from "@/lib/chatbot/config";
import { CASES, seedFor, type Case, type Check } from "./cases";
import { MemoryStore, TODAY } from "./store";

interface Options {
  runs: number;
  only: string | null;
  verbose: boolean;
  concurrency: number;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { runs: 1, only: null, verbose: false, concurrency: 6 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      console.log(`Usage: npm run eval:chat -- [options]

  --runs <n>         run every case n times (default 1); use 3+ to spot flaky cases
  --only <text>      only cases whose name contains <text> (e.g. --only out/ or --only plan)
  --verbose, -v      print every transcript, not just failures
  --concurrency <n>  conversations in flight at once (default 6)`);
      process.exit(0);
    } else if (a === "--runs") opts.runs = Math.max(1, Number(argv[++i]) || 1);
    else if (a === "--only") opts.only = argv[++i] ?? null;
    else if (a === "--verbose" || a === "-v") opts.verbose = true;
    else if (a === "--concurrency") opts.concurrency = Math.max(1, Number(argv[++i]) || 6);
    else {
      console.error(`Unknown option: ${a} (try --help)`);
      process.exit(2);
    }
  }
  return opts;
}

interface Outcome {
  name: string;
  checks: Check[];
  transcript: string;
}

async function runCase(c: Case): Promise<Outcome> {
  const store = new MemoryStore(seedFor(c), c.outdoors);
  const before = store.snapshot();
  const history: ChatTurn[] = [];
  const replies: string[] = [];
  const escalated: boolean[] = [];
  const lines: string[] = [];
  // Stand-in for the site-wide daily Sonnet cap (a Supabase counter in the app).
  let sonnetBudget = c.sonnetBudget ?? 100;
  let claimAttempts = 0;
  const claimSonnet = async () => {
    claimAttempts++;
    if (sonnetBudget <= 0) return false;
    sonnetBudget--;
    return true;
  };

  try {
    for (const turn of c.turns) {
      history.push({ role: "user", content: turn });
      lines.push(`  You: ${turn}`);
      const result = await runAgent({
        history,
        signedIn: c.signedIn,
        env: store.env(),
        units: c.units ?? "us",
        weightKg: c.weightKg ?? null,
        location: c.location ?? null,
        claimSonnet,
        today: TODAY,
      });
      history.push({ role: "assistant", content: result.reply });
      replies.push(result.reply);
      escalated.push(result.escalated);
      lines.push(
        `  Bot${result.escalated ? " [escalated]" : ""}: ${result.reply.replace(/\n/g, "\n       ")}`,
      );
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      name: c.name,
      checks: [{ what: `ran without an error (${message})`, ok: false }],
      transcript: lines.join("\n"),
    };
  }

  return {
    name: c.name,
    checks: c.check({
      replies,
      escalated,
      claimAttempts,
      providerCalls: store.calls,
      trailQueries: store.trailQueries,
      before,
      after: store.snapshot(),
    }),
    transcript: lines.join("\n"),
  };
}

/** Runs `tasks` with at most `limit` in flight, keeping result order. */
async function pool<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, async () => {
      while (next < tasks.length) {
        const i = next++;
        results[i] = await tasks[i]();
      }
    }),
  );
  return results;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is not set. Add it to .env or .env.local (this script loads both).",
    );
    process.exit(2);
  }

  const cases = CASES.filter((c) => !opts.only || c.name.includes(opts.only));
  if (cases.length === 0) {
    console.error(`No cases match "${opts.only}".`);
    process.exit(2);
  }

  console.log(
    `Model ${CHATBOT_MODEL}: ${cases.length} case(s) x ${opts.runs} run(s) = ${cases.length * opts.runs} conversations\n`,
  );

  const tasks = cases.flatMap((c) =>
    Array.from({ length: opts.runs }, () => () => runCase(c)),
  );
  const outcomes = await pool(tasks, opts.concurrency);

  let failedRuns = 0;
  for (const c of cases) {
    const mine = outcomes.filter((o) => o.name === c.name);
    const passes = mine.filter((o) => o.checks.every((k) => k.ok)).length;
    const status = passes === mine.length ? "PASS" : passes === 0 ? "FAIL" : "FLAKY";
    const tally = opts.runs > 1 ? ` (${passes}/${mine.length})` : "";
    console.log(`${status.padEnd(5)} ${c.name}${tally}`);

    for (const o of mine) {
      const failed = o.checks.filter((k) => !k.ok);
      if (failed.length > 0) failedRuns++;
      if (failed.length > 0 || opts.verbose) {
        for (const k of failed) console.log(`        x ${k.what}`);
        console.log(o.transcript);
        console.log();
      }
    }
  }

  const total = outcomes.length;
  console.log(`\n${total - failedRuns}/${total} conversations passed every check.`);
  process.exit(failedRuns === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
