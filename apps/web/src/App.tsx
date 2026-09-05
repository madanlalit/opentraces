import { Show, SignInButton, UserButton } from "@clerk/react";

/* ------------------------------------------------------------------ */
/*  Shared bits                                                        */
/* ------------------------------------------------------------------ */

function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="1" y="1" width="22" height="22" rx="6" className="fill-neutral-800" />
      <polyline
        points="4,15 8,15 10,9 13,17 15,12 17,12 20,7"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Wordmark() {
  return <span className="font-semibold tracking-tight">opentraces</span>;
}

function StartSellingButton({ className = "" }: { className?: string }) {
  return (
    <SignInButton mode="modal">
      <button
        className={
          "rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200 " +
          className
        }
      >
        Start selling
      </button>
    </SignInButton>
  );
}

/* ------------------------------------------------------------------ */
/*  Landing                                                            */
/* ------------------------------------------------------------------ */

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800/60 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2">
          <LogoMark />
          <Wordmark />
        </a>
        <nav className="flex items-center gap-6 text-sm text-neutral-400">
          <a href="#how" className="hidden hover:text-neutral-100 sm:block">
            How it works
          </a>
          <a href="#labs" className="hidden hover:text-neutral-100 sm:block">
            For labs
          </a>
          <SignInButton mode="modal">
            <button className="hover:text-neutral-100">Sign in</button>
          </SignInButton>
          <StartSellingButton />
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,255,255,0.07),transparent)]"
      />
      <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 text-center sm:pt-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-xs text-neutral-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live — ingesting pi coding-agent sessions
        </span>

        <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
          Your agent already did the work.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-pretty text-neutral-400">
          OpenTraces turns everyday coding-agent sessions into rights-clean,
          schema-stable training traces — and pays you when labs and RL teams
          train on them.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <StartSellingButton className="px-5 py-2.5 text-base" />
          <a
            href="#how"
            className="rounded-lg border border-neutral-800 px-5 py-2.5 text-base text-neutral-300 transition hover:border-neutral-600 hover:text-neutral-100"
          >
            How it works
          </a>
        </div>

        {/* terminal demo */}
        <div className="mx-auto mt-14 max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-900/60 text-left shadow-2xl shadow-black/40">
          <div className="flex items-center gap-1.5 border-b border-neutral-800 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
            <span className="ml-3 text-xs text-neutral-500">terminal</span>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6 text-neutral-300">
            <code>
              <span className="text-neutral-500">$</span> ot push{"\n"}
              <span className="text-neutral-500">✓</span> scanned{" "}
              <span className="text-neutral-100">42 pi sessions</span>
              {"\n"}
              <span className="text-neutral-500">?</span> Upload which?{" "}
              <span className="text-neutral-100">1,3-5</span>
              {"\n"}
              <span className="text-emerald-400">✓</span> scrubbed: 2 secrets
              removed, 1 path redacted{"\n"}
              <span className="text-emerald-400">✓</span> uploaded → tr_9f3k2m
              (queued for verification){"\n"}
              <span className="text-neutral-500">→</span> est. value{" "}
              <span className="text-neutral-100">$5.20</span> — you keep{" "}
              <span className="text-neutral-100">80%</span>
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}

function AgentsStrip() {
  return (
    <section className="border-y border-neutral-800/60 bg-neutral-900/30">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-2 px-6 py-5 text-sm">
        <span className="text-xs tracking-widest text-neutral-500 uppercase">
          Agents
        </span>
        <span className="font-medium text-neutral-100">pi</span>
        <span className="flex items-center gap-2 text-neutral-500">
          claude code <Soon />
        </span>
        <span className="flex items-center gap-2 text-neutral-500">
          codex <Soon />
        </span>
        <span className="flex items-center gap-2 text-neutral-500">
          opencode <Soon />
        </span>
      </div>
    </section>
  );
}

function Soon() {
  return (
    <span className="rounded border border-neutral-800 px-1.5 py-0.5 text-[10px] tracking-wide text-neutral-500 uppercase">
      soon
    </span>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Push your sessions",
      body: "ot push reads your agent's local sessions — nothing to export. Consent-first picker, repo allowlists, and nothing leaves your machine without your OK.",
    },
    {
      n: "02",
      title: "We clean & verify",
      body: "Secrets and PII are scrubbed at ingest, environments pinned to repo + commit, and outcomes verified in a neutral sandbox — not self-reported.",
    },
    {
      n: "03",
      title: "You get paid",
      body: "Traces are grouped into domain packs that labs buy. You keep 80% of every sale, paid out via Stripe. Upload once, earn every time it sells.",
    },
  ];
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-3xl font-semibold tracking-tight">
        From laptop to training data
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-neutral-400">
        Three steps between the session you just had and a paycheck.
      </p>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.n}
            className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6"
          >
            <div className="font-mono text-sm text-emerald-400">{s.n}</div>
            <h3 className="mt-3 font-medium">{s.title}</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-400">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ForLabs() {
  const guarantees = [
    {
      title: "One schema",
      body: "ot/0.2 NDJSON — prompt, tool call, observation, outcome — identical shape no matter which agent produced it. Stream it straight into your SFT / DPO / RL loader. No per-agent parsers.",
    },
    {
      title: "Signed rewards",
      body: "Outcomes replayed in a neutral sandbox against the pinned repo + commit, then cryptographically signed. Trust the reward, not the seller's success flag.",
    },
    {
      title: "Rights-clean by default",
      body: "Secrets and PII scrubbed at ingest, seller attestations on file, license terms attached to every pack, contamination screened against public benchmarks.",
    },
  ];
  return (
    <section id="labs" className="border-t border-neutral-800/60 bg-neutral-900/30">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <span className="text-xs tracking-widest text-neutral-500 uppercase">
            For labs & RL teams
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Train on traces you can trust
          </h2>
          <p className="mt-3 text-neutral-400">
            Raw agent dumps are unusable. Every trace on OpenTraces carries
            three guarantees:
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {guarantees.map((g) => (
            <div key={g.title} className="border-l border-neutral-700 pl-5">
              <h3 className="font-medium">{g.title}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{g.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 text-center">
      <h2 className="text-3xl font-semibold tracking-tight">
        Turn yesterday's sessions into training data
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-neutral-400">
        If you run a coding agent, you're already producing inventory.
      </p>
      <div className="mt-8">
        <StartSellingButton className="px-5 py-2.5 text-base" />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-neutral-800/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-sm text-neutral-500">
        <div className="flex items-center gap-2">
          <LogoMark className="h-5 w-5" />
          <span>opentraces</span>
          <span>© 2026</span>
        </div>
        <div className="flex gap-6">
          <a href="#how" className="hover:text-neutral-300">
            How it works
          </a>
          <a href="#labs" className="hover:text-neutral-300">
            For labs
          </a>
          <a href="mailto:hello@opentraces.dev" className="hover:text-neutral-300">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Nav />
      <Hero />
      <AgentsStrip />
      <HowItWorks />
      <ForLabs />
      <CtaBand />
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard (placeholder until the vault slice)                      */
/* ------------------------------------------------------------------ */

function Dashboard() {
  return (
    <div className="min-h-screen bg-neutral-950 p-10 text-neutral-100">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">OpenTraces</h1>
          <p className="text-sm text-neutral-500">Seller vault</p>
        </div>
        {/* v6: sign-out redirect is configured on <ClerkProvider afterSignOutUrl> */}
        <UserButton />
      </header>

      <section className="mt-10 rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
        <h2 className="font-medium">Vault</h2>
        <p className="mt-2 text-sm text-neutral-400">
          No traces yet. From your machine run:
        </p>
        <pre className="mt-3 rounded-lg bg-black p-4 font-mono text-sm text-neutral-300">
          <code>pipx install opentraces{"\n"}ot login{"\n"}ot push</code>
        </pre>
        <p className="mt-3 text-xs text-neutral-500">
          Traces uploaded here appear in your vault after scrubbing.
        </p>
      </section>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Show when="signed-out">
        <Landing />
      </Show>
      <Show when="signed-in">
        <Dashboard />
      </Show>
    </>
  );
}
