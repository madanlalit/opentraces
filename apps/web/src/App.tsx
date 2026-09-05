import { Show, SignInButton, UserButton } from "@clerk/react";
import {
  ArrowRight,
  Banknote,
  Braces,
  CloudUpload,
  FileSignature,
  Plus,
  Scale,
  ShieldCheck,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Shared bits                                                        */
/* ------------------------------------------------------------------ */

function Wordmark() {
  return <span className="font-semibold tracking-tight">opentraces</span>;
}

function StartSellingButton({ className = "" }: { className?: string }) {
  return (
    <SignInButton mode="modal">
      <button
        className={
          "group inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 " +
          className
        }
      >
        Start selling
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </SignInButton>
  );
}

function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={
        "text-xs font-medium tracking-[0.2em] uppercase " +
        (dark ? "text-neutral-500" : "text-neutral-400")
      }
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Landing — editorial frame: one hairline-bordered column,           */
/*  sections separated by rules (openai.com), dark contrast band       */
/*  (cognition), bento cards, marquee, FAQ                             */
/* ------------------------------------------------------------------ */

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2">
          <Wordmark />
        </a>
        <nav className="flex items-center gap-6 text-sm text-neutral-500">
          <a href="#how" className="hidden hover:text-neutral-900 sm:block">
            How it works
          </a>
          <a href="#labs" className="hidden hover:text-neutral-900 sm:block">
            For labs
          </a>
          <a href="#faq" className="hidden hover:text-neutral-900 sm:block">
            FAQ
          </a>
          <SignInButton mode="modal">
            <button className="hover:text-neutral-900">Sign in</button>
          </SignInButton>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-neutral-200">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[440px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(0,0,0,0.05),transparent)]"
      />
      <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-20 text-center sm:pt-32">
        <Eyebrow>Sell your agent traces</Eyebrow>
        <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
          Your agent already did{" "}
          <span className="font-serif font-normal italic">the work.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-neutral-500">
          You run a coding agent all day — fixes, tests, refactors. OpenTraces
          turns those sessions into rights-clean training traces that labs pay
          for. Push from your terminal. Keep 80%.
        </p>

        <div className="mt-9 flex items-center justify-center gap-3">
          <StartSellingButton className="px-5 py-2.5 text-base" />
          <a
            href="#how"
            className="rounded-lg border border-neutral-300 px-5 py-2.5 text-base text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-900"
          >
            How it works
          </a>
        </div>
        <p className="mt-4 text-xs tracking-wide text-neutral-400">
          Consent-first picker · scrubbed at ingest · paid out via Stripe
        </p>

        {/* product demo — cognition-style: the product IS the hero visual */}
        <div className="relative mx-auto mt-16 max-w-2xl">
          <div
            aria-hidden
            className="absolute -inset-4 rounded-3xl bg-[radial-gradient(50%_60%_at_50%_40%,rgba(16,185,129,0.08),transparent)]"
          />
          <div className="relative rounded-2xl border border-neutral-800 bg-neutral-950 text-left shadow-2xl shadow-neutral-900/15">
            <div className="flex items-center gap-1.5 border-b border-neutral-800 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
              <span className="ml-3 text-xs text-neutral-500">terminal</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6 text-neutral-300 sm:p-6 sm:text-sm sm:leading-7">
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
      </div>
    </section>
  );
}

/* agents marquee — duplicate content for a seamless loop */
function AgentsMarquee() {
  const items: React.ReactNode[] = [
    <span key="pi" className="flex items-center gap-2.5">
      <span
        aria-label="pi"
        title="pi — ingesting today"
        className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-900 text-sm leading-none text-white"
      >
        π
      </span>
      <span className="font-medium text-neutral-900">pi</span>
    </span>,
    <span key="cc" className="flex items-center gap-2.5">
      <img src="/agents/claudecode.svg" alt="Claude Code" title="Claude Code" className="h-6 w-6 opacity-70" />
      <SoonLabel />
    </span>,
    <span key="cx" className="flex items-center gap-2.5">
      <img src="/agents/codex.svg" alt="Codex CLI" title="Codex CLI" className="h-6 w-6 opacity-70" />
      <SoonLabel />
    </span>,
    <span key="oc" className="flex items-center gap-2.5">
      <img src="/agents/opencode.svg" alt="OpenCode" title="OpenCode" className="h-6 w-6 opacity-70" />
      <SoonLabel />
    </span>,
  ];
  return (
    <section className="border-b border-neutral-200 bg-neutral-50">
      <div className="marquee-paused relative overflow-hidden py-5" title="Supported agents">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-neutral-50 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-neutral-50 to-transparent" />
        <div className="animate-marquee flex w-max items-center gap-14 pl-14">
          {items}
          {items.map((it, i) => (
            <span key={"dup-" + i} className="contents">
              {it}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function SoonLabel() {
  return (
    <span className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] tracking-wide text-neutral-400 uppercase">
      soon
    </span>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="border-b border-neutral-200">
      <div className="px-6 py-20">
        <div className="text-center">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            From laptop to training data
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-neutral-500">
            Three steps between the session you just had and a paycheck.
          </p>
        </div>

        {/* bento */}
        <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-7 transition hover:border-neutral-300 md:col-span-2">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white">
                <CloudUpload className="h-5 w-5" />
              </div>
              <span className="font-mono text-sm text-emerald-600">01</span>
            </div>
            <h3 className="mt-5 text-lg font-medium">Push your sessions</h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-500">
              ot push reads your agent's local sessions — nothing to export, no
              forms. A consent-first picker and repo allowlists mean nothing
              leaves your machine without your OK.
            </p>
            <pre className="mt-5 max-w-sm rounded-lg bg-neutral-950 p-4 font-mono text-xs leading-5 text-neutral-400">
              <code>
                <span className="text-neutral-600"># ~/.opentraces/config.toml</span>
                {"\n"}allowlist = ["github.com/acme/*"]{"\n"}scrub = "strict"{"\n"}
                license = "standard"
              </code>
            </pre>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-7 transition hover:border-neutral-300">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="font-mono text-sm text-emerald-600">02</span>
            </div>
            <h3 className="mt-5 text-lg font-medium">We clean & verify</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Secrets and PII scrubbed on arrival, environments pinned to repo +
              commit, outcomes checked in a neutral sandbox — not self-reported.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-7 transition hover:border-neutral-300">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white">
                <Banknote className="h-5 w-5" />
              </div>
              <span className="font-mono text-sm text-emerald-600">03</span>
            </div>
            <h3 className="mt-5 text-lg font-medium">You get paid</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Traces ship in domain packs that labs buy, via Stripe payouts.
            </p>
          </div>

          <div className="flex items-center justify-between gap-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-7 md:col-span-2">
            <div>
              <h3 className="text-lg font-medium">What scrubbing catches</h3>
              <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm text-neutral-500 sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> API keys &
                  secrets
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Emails &
                  PII
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Absolute
                  paths & usernames
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Benchmark
                  contamination
                </li>
              </ul>
            </div>
            <div className="hidden text-right sm:block">
              <div className="text-5xl font-semibold tracking-tight">80%</div>
              <div className="mt-1 text-xs tracking-wide text-neutral-400 uppercase">
                to you, always
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* dark contrast band — cognition-style */
function ForLabs() {
  const guarantees = [
    {
      icon: Braces,
      title: "One schema",
      body: "ot/0.2 NDJSON — prompt, tool call, observation, outcome — identical shape regardless of the agent that produced it. Stream it straight into your SFT / DPO / RL loader.",
    },
    {
      icon: FileSignature,
      title: "Signed rewards",
      body: "Outcomes replayed in a neutral sandbox against the pinned repo + commit, then cryptographically signed. Trust the reward, not the seller's success flag.",
    },
    {
      icon: Scale,
      title: "Rights-clean by default",
      body: "Secrets and PII scrubbed at ingest, seller attestations on file, license terms on every pack, contamination screened against public benchmarks.",
    },
  ];
  return (
    <section id="labs" className="border-b border-neutral-200 bg-neutral-950 text-white">
      <div className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Eyebrow dark>For labs & RL teams</Eyebrow>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Train on traces you can{" "}
            <span className="font-serif font-normal italic text-neutral-300">trust.</span>
          </h2>
          <p className="mt-4 max-w-xl text-neutral-400">
            Raw agent dumps are unusable — vendor-shaped, untrusted rewards,
            rights messes. Every trace on OpenTraces carries three guarantees:
          </p>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-800 md:grid-cols-3">
            {guarantees.map((g) => (
              <div key={g.title} className="bg-neutral-950 p-8">
                <g.icon className="h-5 w-5 text-emerald-400" />
                <h3 className="mt-4 font-medium">{g.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-400">{g.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const qs = [
    {
      q: "Who owns the code in my sessions?",
      a: "You do. You're licensing the use of the trace data, not selling your code. You pick the license per pack and can delist anytime — attestations are recorded at upload.",
    },
    {
      q: "What about secrets or client work?",
      a: "Scrubbing runs before anything is listed: secrets, PII and absolute paths are removed, benchmark contamination is flagged. Use repo allowlists, and never push private client repos you don't have rights to share.",
    },
    {
      q: "When do I get paid?",
      a: "Buyers pay per pack through Stripe. You keep 80% of every sale. Payouts are released after a short 7-day refund window, then paid automatically.",
    },
    {
      q: "Which models can I use?",
      a: "Any. Model provenance is recorded on every trace, and labs filter by whatever fits their rights and training needs.",
    },
  ];
  return (
    <section id="faq" className="border-b border-neutral-200">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="text-center">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Fair questions
          </h2>
        </div>
        <div className="mt-10 divide-y divide-neutral-200 border-y border-neutral-200">
          {qs.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between py-5 font-medium text-neutral-900 [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-45" />
              </summary>
              <p className="pb-5 text-sm leading-6 text-neutral-500">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_100%,rgba(0,0,0,0.04),transparent)]"
      />
      <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Turn yesterday's sessions into{" "}
          <span className="font-serif font-normal italic">training data.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-neutral-500">
          If you run a coding agent, you're already producing inventory. Start
          with last week's sessions.
        </p>
        <div className="mt-8">
          <StartSellingButton className="px-5 py-2.5 text-base" />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-neutral-200">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-neutral-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <Wordmark />
            <span>© 2026</span>
            <span className="text-neutral-300">·</span>
            <span className="text-neutral-400">built on the pi coding agent</span>
          </div>
          <div className="flex gap-6">
            <a href="#how" className="hover:text-neutral-900">
              How it works
            </a>
            <a href="#labs" className="hover:text-neutral-900">
              For labs
            </a>
            <a href="#faq" className="hover:text-neutral-900">
              FAQ
            </a>
            <a href="mailto:hello@opentraces.dev" className="hover:text-neutral-900">
              Contact
            </a>
          </div>
        </div>
        {/* oversized wordmark, editorial footer */}
        <div
          aria-hidden
          className="mt-10 overflow-hidden text-center text-[18vw] leading-[0.85] font-semibold tracking-tighter text-neutral-100 select-none sm:text-[13vw] md:text-[11rem]"
        >
          opentraces
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <Nav />
      <main className="mx-auto max-w-6xl border-x border-neutral-200">
        <Hero />
        <AgentsMarquee />
        <HowItWorks />
        <ForLabs />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard (placeholder until the vault slice)                      */
/* ------------------------------------------------------------------ */

function Dashboard() {
  return (
    <div className="min-h-screen bg-white p-10 text-neutral-900">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">OpenTraces</h1>
          <p className="text-sm text-neutral-500">Seller vault</p>
        </div>
        {/* v6: sign-out redirect is configured on <ClerkProvider afterSignOutUrl> */}
        <UserButton />
      </header>

      <section className="mt-10 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
        <h2 className="font-medium">Vault</h2>
        <p className="mt-2 text-sm text-neutral-500">
          No traces yet. From your machine run:
        </p>
        <pre className="mt-3 rounded-lg bg-neutral-950 p-4 font-mono text-sm text-neutral-300">
          <code>pipx install opentraces{"\n"}ot login{"\n"}ot push</code>
        </pre>
        <p className="mt-3 text-xs text-neutral-400">
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
