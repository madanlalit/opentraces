import { useEffect, useRef, useState } from "react";
import { Show, SignUp, useAuth, useClerk, UserButton, useUser } from "@clerk/react";
import { ArrowRight, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Uniform layout system                                              */
/*  Every section: hairline bottom border, max-w-5xl container,        */
/*  px-6 gutters, py-24 rhythm. Type scale:                            */
/*    h1 text-5xl/6xl font-semibold · h2 text-3xl font-semibold ·      */
/*    h3 text-lg font-medium · body text-sm leading-6 muted            */
/*  Copy rule: customer-facing, no em dashes.                          */
/*  Routes: / landing · /sign-up Clerk sign-up page · /dashboard vault */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Tiny router (pathname state, no dependency)                        */
/* ------------------------------------------------------------------ */

function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const on = () => setPath(window.location.pathname);
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  return path;
}

function navigate(to: string) {
  history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function Link({
  to,
  children,
  ...rest
}: React.ComponentProps<"a"> & { to: string }) {
  return (
    <a
      href={to}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

function Navigate({ to }: { to: string }) {
  useEffect(() => {
    navigate(to);
  }, [to]);
  return null;
}

/* ------------------------------------------------------------------ */
/*  Shared brand + layout                                              */
/* ------------------------------------------------------------------ */

function Wordmark() {
  return <span className="font-semibold tracking-tight">opentraces</span>;
}

/** Brand lockup: wordmark inside a sharp, transparent rectangle. */
function Logo() {
  return (
    <span className="inline-flex items-center border border-neutral-900 px-3 py-1.5 text-sm font-semibold tracking-tight">
      opentraces
    </span>
  );
}

function SignInButtonMenu() {
  const { openSignIn } = useClerk();
  return (
    <Button variant="ghost" size="sm" onClick={() => openSignIn()}>
      Sign in
    </Button>
  );
}

/** Primary CTA, auth-aware: new visitors go to sign-up, sellers go to their vault. */
function PrimaryCta() {
  const { isSignedIn } = useAuth();
  return (
    <Button size="lg" asChild className="group">
      <Link to={isSignedIn ? "/dashboard" : "/sign-up"}>
        {isSignedIn ? "Go to dashboard" : "Start selling"}
        <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </Button>
  );
}

function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("border-b border-border", className)}>
      <div className="mx-auto max-w-5xl px-6 py-24">{children}</div>
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Landing                                                            */
/* ------------------------------------------------------------------ */

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2" aria-label="opentraces home">
          <Logo />
        </Link>
        <nav className="flex items-center">
          <Show when="signed-in">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          </Show>
          <Show when="signed-out">
            <SignInButtonMenu />
          </Show>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_60%,transparent_100%)]"
      />
      <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-24 text-center sm:pt-32">
        <Badge variant="outline" asChild>
          <a href="#how" className="group gap-2 pr-2 pl-3">
            <img src="/agents/pi.svg" alt="pi" className="h-3.5 w-3.5" />
            available now
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </a>
        </Badge>

        <h1 className="mx-auto mt-8 max-w-3xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
          Get paid for the work your{" "}
          <span className="underline decoration-neutral-300 decoration-[4px] underline-offset-8">agent</span>{" "}
          already did.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-pretty text-muted-foreground">
          OpenTraces turns your coding agent sessions into training data that
          labs pay for. Push a session, we clean and check it, and you keep 80%
          of every sale.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <PrimaryCta />
          <Button variant="outline" size="lg" asChild>
            <Link to="/how">How it works</Link>
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Building an RL pipeline?{" "}
          <a
            href="mailto:labs@opentraces.dev"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Talk to us
          </a>
        </p>

        <div className="mx-auto mt-16 max-w-2xl rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl shadow-neutral-900/15">
          <pre className="overflow-x-auto p-6 text-left font-mono text-[13px] leading-6 text-neutral-300">
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
              <span className="text-emerald-400">✓</span> uploaded to tr_9f3k2m
              {"\n"}
              <span className="text-neutral-500">→</span> est. value{" "}
              <span className="text-neutral-100">$5.20</span>, you keep{" "}
              <span className="text-neutral-100">80%</span>
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}

function Interlude() {
  return (
    <Section>
      <p className="max-w-2xl text-2xl leading-9 font-medium tracking-tight text-balance">
        The work is already done. Your agent fixed the bug, ran the tests, and
        closed the loop. Captured well, that experience can teach a model.
      </p>
    </Section>
  );
}

function Facts() {
  const facts = [
    { big: "80%", small: "of every sale, paid to you" },
    { big: "1", small: "format for every agent and model" },
    { big: "4", small: "agents supported on our roadmap" },
    { big: "$0", small: "to start uploading" },
  ];
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-px bg-border lg:grid-cols-4">
        {facts.map((f) => (
          <div key={f.small} className="bg-background px-6 py-12">
            <div className="text-4xl font-semibold tracking-tight">{f.big}</div>
            <div className="mt-2 text-sm text-muted-foreground">{f.small}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      k: "Push",
      title: "Send your sessions",
      body: "One command reads the sessions stored on your machine. Nothing to export and no forms to fill. A consent picker and repo allowlists mean nothing is uploaded without your approval.",
    },
    {
      n: "02",
      k: "Scrub",
      title: "We clean and check it",
      body: "Secrets and personal data are removed the moment a trace arrives. Environments are pinned to a repository and commit, and every outcome is checked in a neutral sandbox. Nothing is self reported.",
    },
    {
      n: "03",
      k: "Earn",
      title: "You get paid",
      body: "Your traces are grouped into packs that labs buy through Stripe. You keep 80% of every sale, paid out after a short refund window.",
    },
  ];
  return (
    <Section id="how">
      <div className="text-center">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          From your laptop to training data
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
          Three steps between the session you just finished and your first
          payout.
        </p>
      </div>
      <div className="mt-16 grid gap-12 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n}>
            <div className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
              {s.n} · {s.k}
            </div>
            <h3 className="mt-4 text-lg font-medium">{s.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {s.body}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-12 text-center">
        <Button variant="outline" asChild>
          <Link to="/how">
            See the full walkthrough
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </Section>
  );
}

function ForLabs() {
  const guarantees = [
    {
      title: "One format",
      body: "Every trace follows one open schema: prompt, tool call, observation, outcome. The shape is identical no matter which agent produced it, so it streams straight into your training pipeline.",
    },
    {
      title: "Verified rewards",
      body: "We replay each outcome in a neutral sandbox against the exact repository and commit, then sign the result. You can trust the reward instead of a seller claim.",
    },
    {
      title: "Clean rights",
      body: "Secrets and personal data are removed at ingest. Sellers attest their rights, license terms ship with every pack, and we screen for benchmark contamination.",
    },
  ];
  return (
    <Section id="labs">
      <Eyebrow>For labs and RL teams</Eyebrow>
      <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-balance">
        Train on traces you can trust.
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
        Raw agent dumps are hard to use. Formats differ by vendor, rewards
        cannot be trusted, and rights are unclear. Every trace on OpenTraces
        solves all three.
      </p>
      <div className="mt-8">
        <Button variant="outline" asChild className="group">
          <Link to="/marketplace">
            Browse the marketplace
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </div>
      <div className="mt-16 grid gap-12 md:grid-cols-3">
        {guarantees.map((g) => (
          <div key={g.title}>
            <h3 className="text-lg font-medium">{g.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {g.body}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Faq() {
  const qs = [
    {
      q: "Who owns the code in my sessions?",
      a: "You do. You license the use of the trace data, you do not sell your code. You choose the license for each pack and can remove it from sale at any time. Attestations are recorded when you upload.",
    },
    {
      q: "What about secrets or client work?",
      a: "Scrubbing runs before anything can be listed. Secrets, personal data, and absolute paths are removed, and we flag overlap with public benchmarks. Use repo allowlists, and only share work you have the rights to.",
    },
    {
      q: "When do I get paid?",
      a: "Buyers pay per pack through Stripe. You keep 80% of every sale. Payouts are released after a short 7 day refund window and then sent automatically.",
    },
    {
      q: "Which models can I use?",
      a: "Any model. We record model provenance on every trace, so labs can filter for exactly what fits their rights and training needs.",
    },
  ];
  return (
    <Section id="faq">
      <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
        <div>
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Fair questions
          </h2>
        </div>
        <Accordion type="single" collapsible className="border-t">
          {qs.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}

function Works() {
  return (
    <Section>
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm">
        <Eyebrow>Agents</Eyebrow>
        <span className="flex items-center gap-2" title="pi, ingesting today">
          <img src="/agents/pi.svg" alt="pi" className="h-5 w-5" />
          <span className="font-medium">pi</span>
        </span>
        <span
          className="flex items-center gap-2 text-muted-foreground"
          title="Claude Code, coming soon"
        >
          <img
            src="/agents/claudecode.svg"
            alt="Claude Code"
            className="h-5 w-5 opacity-50"
          />
          claude code · soon
        </span>
        <span
          className="flex items-center gap-2 text-muted-foreground"
          title="Codex CLI, coming soon"
        >
          <img
            src="/agents/codex.svg"
            alt="Codex CLI"
            className="h-5 w-5 opacity-50"
          />
          codex · soon
        </span>
        <span
          className="flex items-center gap-2 text-muted-foreground"
          title="OpenCode, coming soon"
        >
          <img
            src="/agents/opencode.svg"
            alt="OpenCode"
            className="h-5 w-5 opacity-50"
          />
          opencode · soon
        </span>
      </div>
    </Section>
  );
}

function CtaBand() {
  return (
    <Section className="text-center">
      <h2 className="mx-auto max-w-xl text-3xl font-semibold tracking-tight text-balance">
        If you run a coding agent, you are already producing inventory.
      </h2>
      <div className="mt-8 flex justify-center">
        <PrimaryCta />
      </div>
    </Section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Wordmark />
            <span>© 2026</span>
            <span>·</span>
            <span>built on the pi coding agent</span>
          </div>
          <div className="flex gap-6">
            <Link to="/marketplace" className="hover:text-foreground">
              Marketplace
            </Link>
            <Link to="/how" className="hover:text-foreground">
              How it works
            </Link>
            <a href="#labs" className="hover:text-foreground">
              For labs
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
            <a href="mailto:hello@opentraces.dev" className="hover:text-foreground">
              Contact
            </a>
          </div>
        </div>
        <div
          aria-hidden
          className="mt-10 overflow-hidden text-center text-[18vw] leading-[0.85] font-semibold tracking-tighter text-neutral-100 select-none sm:text-[13vw] md:text-[10rem]"
        >
          opentraces
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Interlude />
      <Facts />
      <HowItWorks />
      <ForLabs />
      <Faq />
      <Works />
      <CtaBand />
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sign-up page (dedicated Clerk route)                               */
/* ------------------------------------------------------------------ */

function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-6">
          <Link to="/" aria-label="opentraces home">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">
              Create your seller account
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Push your first trace in minutes, keep 80% of every sale.
            </p>
          </div>
          <SignUp
            path="/sign-up"
            routing="path"
            fallbackRedirectUrl="/dashboard"
          />
        </div>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-6 text-center text-sm text-muted-foreground">
          Already selling?{" "}
          <SignInLink className="text-foreground underline-offset-4 hover:underline" />
        </div>
      </footer>
    </div>
  );
}

function SignInLink({ className }: { className?: string }) {
  const { openSignIn } = useClerk();
  return (
    <button type="button" className={cn(className)} onClick={() => openSignIn()}>
      Sign in
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard: same theme as the landing, app density                 */
/* ------------------------------------------------------------------ */

function DashboardNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link to="/" aria-label="opentraces home">
          <Logo />
        </Link>
        <nav className="flex items-center">
          <UserButton />
        </nav>
      </div>
    </header>
  );
}

function StatTile({ big, small }: { big: string; small: string }) {
  return (
    <div className="bg-background px-6 py-10">
      <div className="text-4xl font-semibold tracking-tight">{big}</div>
      <div className="mt-2 text-sm text-muted-foreground">{small}</div>
    </div>
  );
}

function Terminal({ lines }: { lines: string[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl shadow-neutral-900/15">
      <pre className="overflow-x-auto p-6 text-left font-mono text-[13px] leading-6 text-neutral-300">
        <code>
          {lines.map((line, i) => (
            <span key={i}>
              {line.startsWith("#") ? (
                <span className="text-neutral-500">{line}</span>
              ) : (
                <>
                  <span className="text-neutral-500">$</span> {line}
                </>
              )}
              {"\n"}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

type TraceRow = {
  id: string;
  agent: string;
  model: string | null;
  repo_url: string | null;
  base_commit?: string | null;
  task_desc: string | null;
  n_steps: number;
  cost_usd: number | null;
  status: string;
  created_at: string;
  content_hash?: string | null;
};

function CopyChip({ text, display }: { text: string; display?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      title="Copy"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        });
      }}
      className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {ok ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
      {display ?? text}
    </button>
  );
}

function StatusLabel(status: string): string {
  const map: Record<string, string> = {
    uploaded: "Received",
    scrubbing: "Cleaning",
    scrubbed: "Ready",
    rejected: "Rejected",
  };
  return map[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "outline" | "secondary" | "destructive" }> = {
    uploaded: { label: "Received", variant: "outline" },
    scrubbing: { label: "Cleaning", variant: "secondary" },
    scrubbed: { label: "Ready", variant: "default" },
    rejected: { label: "Rejected", variant: "destructive" },
  };
  const v = map[status] ?? { label: status.charAt(0).toUpperCase() + status.slice(1), variant: "outline" as const };
  return <Badge variant={v.variant}>{v.label}</Badge>;
}

function VaultTable({ traces, onOpen }: { traces: TraceRow[]; onOpen: (id: string) => void }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
          <th className="py-3 pr-4 font-medium">Session</th>
          <th className="py-3 pr-4 font-medium">Trace</th>
          <th className="py-3 pr-4 font-medium">Agent</th>
          <th className="py-3 pr-4 text-right font-medium">Steps</th>
          <th className="py-3 pr-4 text-right font-medium">Cost</th>
          <th className="py-3 pr-4 font-medium">Status</th>
          <th className="py-3 text-right font-medium">Uploaded</th>
        </tr>
      </thead>
      <tbody>
        {traces.map((t) => (
          <tr
            key={t.id}
            onClick={() => onOpen(t.id)}
            className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-accent/50"
          >
            <td className="max-w-56 py-3 pr-4">
              <div className="truncate font-medium" title={t.task_desc ?? t.repo_url ?? t.id}>
                {t.task_desc ?? t.repo_url ?? t.id}
              </div>
              {t.repo_url && (
                <div className="truncate text-xs text-muted-foreground" title={t.repo_url}>
                  {t.repo_url}
                </div>
              )}
            </td>
            <td className="py-3 pr-4">
              <CopyChip text={t.id} display={t.id.slice(3, 11)} />
            </td>
            <td className="max-w-40 py-3 pr-4">
              <div>{t.agent}</div>
              {t.model && (
                <div className="truncate font-mono text-xs text-muted-foreground" title={t.model}>
                  {t.model}
                </div>
              )}
            </td>
            <td className="py-3 pr-4 text-right tabular-nums">{t.n_steps}</td>
            <td className="py-3 pr-4 text-right tabular-nums">
              {t.cost_usd != null ? `$${t.cost_usd.toFixed(2)}` : "–"}
            </td>
            <td className="py-3 pr-4">
              <StatusBadge status={t.status} />
            </td>
            <td className="py-3 text-right text-muted-foreground tabular-nums">{t.created_at.slice(0, 10)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GetStartedPanel() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="grid items-start gap-12 md:grid-cols-2">
        <div>
          <Eyebrow>Get started</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Push your first trace.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Install the CLI with uv, sign in once, and pick the sessions
            you want to sell. The consent picker shows exactly what will
            be uploaded, and nothing leaves your machine without your
            approval.
          </p>
          <ul className="mt-6 space-y-3 text-sm leading-6 text-muted-foreground">
            <li className="flex gap-3">
              <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-neutral-900" />
              Secrets and personal data are scrubbed on arrival.
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-neutral-900" />
              Each trace is pinned to a repository and commit.
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-neutral-900" />
              You choose the license and can delist at any time.
            </li>
          </ul>
        </div>
        <Terminal lines={["uv tool install opentraces", "ot login", "ot push"]} />
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Prefer to look around first?{" "}
        <Link
          to="/"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Back to the homepage
        </Link>
      </p>
    </div>
  );
}

function Dashboard() {
  const { user } = useUser();
  const { isSignedIn, getToken } = useAuth();
  const [traces, setTraces] = useState<TraceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<"new" | "steps" | "cost">("new");
  const [packs, setPacks] = useState<MyPack[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [packTitle, setPackTitle] = useState("");
  const [packPrice, setPackPrice] = useState("29");
  const [packTags, setPackTags] = useState("");
  const [packBusy, setPackBusy] = useState(false);
  const [packMsg, setPackMsg] = useState<string | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  // Best available name: first name, then full name, username, email prefix.
  const first =
    user?.firstName ??
    user?.fullName?.split(" ")[0] ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress.split("@")[0].replace(/^./, (c) => c.toUpperCase()) ??
    "there";

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("no session");
        const res = await fetch(`${API_URL}/v1/traces`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`vault request failed (${res.status})`);
        const data = (await res.json()) as { traces?: TraceRow[] };
        if (!cancelled) {
          setTraces(data.traces ?? []);
          setError(null);
        }
        const pres = await fetch(`${API_URL}/v1/my/packs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (pres.ok && !cancelled) {
          const pdata = (await pres.json()) as { packs?: MyPack[] };
          setPacks(pdata.packs ?? []);
        }
        const prof = await fetch(`${API_URL}/v1/my/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (prof.ok && !cancelled) {
          const pd = (await prof.json()) as { profile?: { github_url?: string | null } };
          setGithubUrl(pd.profile?.github_url ?? "");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "failed to load your vault");
          setTraces(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, getToken, refreshKey]);

  const steps = traces?.reduce((n, t) => n + t.n_steps, 0) ?? 0;
  const spend = traces?.reduce((n, t) => n + (t.cost_usd ?? 0), 0) ?? 0;
  const ready = traces?.filter((t) => t.status === "scrubbed").length ?? 0;

  const statusCounts = new Map<string, number>();
  for (const t of traces ?? []) statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1);
  const repos = new Set((traces ?? []).map((t) => t.repo_url).filter(Boolean)).size;
  const agentCounts = new Map<string, number>();
  for (const t of traces ?? []) agentCounts.set(t.agent, (agentCounts.get(t.agent) ?? 0) + 1);
  const agentsText = [...agentCounts.entries()].map(([a, n]) => `${a} ${n}`).join(" · ");

  const shown = (() => {
    let list = traces ?? [];
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    return [...list].sort((a, b) =>
      sortKey === "steps"
        ? b.n_steps - a.n_steps
        : sortKey === "cost"
          ? (b.cost_usd ?? 0) - (a.cost_usd ?? 0)
          : b.created_at.localeCompare(a.created_at)
    );
  })();

  const readyTraces = (traces ?? []).filter((t) => t.status === "scrubbed");

  const createPack = async () => {
    setPackBusy(true);
    setPackMsg(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("no session");
      const res = await fetch(`${API_URL}/v1/packs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: packTitle,
          price_cents: Math.round(parseFloat(packPrice || "0") * 100),
          tags: packTags.split(",").map((t) => t.trim()).filter(Boolean),
          trace_ids: [...selected],
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; pack_id?: string };
      if (!res.ok) throw new Error(body.error ?? `failed (${res.status})`);
      setPackMsg(`Pack created as draft. Publish it below to list it on the marketplace.`);
      setCreateOpen(false);
      setSelected(new Set());
      setPackTitle("");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setPackMsg(e instanceof Error ? e.message : "something went wrong");
    } finally {
      setPackBusy(false);
    }
  };

  const packAction = async (id: string, action: "publish" | "delist") => {
    setPackBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("no session");
      const res = await fetch(`${API_URL}/v1/packs/${id}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `failed (${res.status})`);
      }
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setPackMsg(e instanceof Error ? e.message : "something went wrong");
    } finally {
      setPackBusy(false);
    }
  };

  const saveProfile = async () => {
    setProfileSaved(false);
    try {
      const token = await getToken();
      if (!token) throw new Error("no session");
      const res = await fetch(`${API_URL}/v1/my/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ github_url: githubUrl }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `failed (${res.status})`);
      }
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (e) {
      setPackMsg(e instanceof Error ? e.message : "could not save profile");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardNav />

      <main>
        {/* header */}
        <div className="border-b border-border">
          <div className="mx-auto max-w-5xl px-6 pt-16 pb-16">
            <h1 className="text-4xl font-semibold tracking-tight">
              Welcome back, {first}.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              This is your vault. Traces you push from the terminal land here
              after scrubbing, then get grouped into packs for labs to buy.
            </p>
          </div>
        </div>

        {/* stats, Facts-style tiles */}
        <div className="border-b border-border">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-px bg-border lg:grid-cols-4">
            <StatTile big={String(traces?.length ?? 0)} small="traces in your vault" />
            <StatTile big={steps.toLocaleString()} small="steps captured" />
            <StatTile big={String(ready)} small="scrubbed and ready" />
            <StatTile big={`$${spend.toFixed(2)}`} small="token spend" />
          </div>
        </div>

        {/* vault: error / loading / empty / table */}
        <div className="border-b border-border">
          <div className="mx-auto max-w-5xl px-6 py-16">
            {error ? (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Could not load your vault: {error}
                </p>
                <div className="mt-4">
                  <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
                    Retry
                  </Button>
                </div>
              </div>
            ) : traces === null ? (
              <p className="text-center text-sm text-muted-foreground">Loading your traces…</p>
            ) : traces.length === 0 ? (
              <GetStartedPanel />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Eyebrow>Your traces</Eyebrow>
                  <div className="flex items-center gap-2">
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as "new" | "steps" | "cost")}
                      className="border border-input bg-background px-2 py-1.5 text-xs text-muted-foreground outline-none focus:border-ring"
                    >
                      <option value="new">Newest first</option>
                      <option value="steps">Most steps</option>
                      <option value="cost">Highest cost</option>
                    </select>
                    <Button variant="ghost" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
                      Refresh
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span>
                    {traces.length} trace{traces.length === 1 ? "" : "s"} · {repos} repo{repos === 1 ? "" : "s"}
                    {agentsText ? ` · ${agentsText}` : ""}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {["all", ...[...statusCounts.keys()]].map((s) => {
                      const label = s === "all" ? "All" : StatusLabel(s);
                      const count = s === "all" ? traces.length : (statusCounts.get(s) ?? 0);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatusFilter(s)}
                          className={cn(
                            "border px-2 py-0.5 transition-colors",
                            statusFilter === s
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-border text-muted-foreground hover:border-neutral-400"
                          )}
                        >
                          {label} {count}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-4 border-t">
                  <VaultTable traces={shown} onOpen={(id) => navigate(`/dashboard/traces/${id}`)} />
                </div>
                <p className="mt-6 text-sm text-muted-foreground">
                  Push more sessions with <span className="font-mono">ot push</span>. New
                  traces appear here after scrubbing.
                </p>
              </>
            )}
          </div>
        </div>

        {/* packs: create + list */}
        <div className="border-b border-border">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Eyebrow>Sell</Eyebrow>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight">Your packs</h2>
              </div>
              {readyTraces.length > 0 && !createOpen && (
                <Button
                  size="sm"
                  onClick={() => {
                    setCreateOpen(true);
                    setPackMsg(null);
                  }}
                >
                  Create pack
                </Button>
              )}
            </div>

            <div className="mt-8 border border-border p-5">
              <h3 className="text-sm font-medium">Seller profile</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Shown on every pack you publish, so buyers can verify who they
                are buying from. Required before publishing.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/yourname"
                  className="w-72 border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:border-ring"
                />
                <Button variant="outline" size="sm" onClick={saveProfile}>
                  Save
                </Button>
                {profileSaved && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                )}
              </div>
            </div>

            {createOpen && (
              <div className="mt-8 border border-border p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium tracking-[0.15em] text-muted-foreground uppercase">
                      Pack title
                    </span>
                    <input
                      value={packTitle}
                      onChange={(e) => setPackTitle(e.target.value)}
                      placeholder="pi sessions: real bug fixes"
                      className="mt-1 w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-xs font-medium tracking-[0.15em] text-muted-foreground uppercase">
                        Price (USD)
                      </span>
                      <input
                        value={packPrice}
                        onChange={(e) => setPackPrice(e.target.value)}
                        inputMode="decimal"
                        className="mt-1 w-full border border-input bg-background px-3 py-2 text-sm tabular-nums outline-none focus:border-ring"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium tracking-[0.15em] text-muted-foreground uppercase">
                        Tags
                      </span>
                      <input
                        value={packTags}
                        onChange={(e) => setPackTags(e.target.value)}
                        placeholder="bugfix, testing"
                        className="mt-1 w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                      />
                    </label>
                  </div>
                </div>
                <div className="mt-5">
                  <span className="text-xs font-medium tracking-[0.15em] text-muted-foreground uppercase">
                    Ready traces ({readyTraces.length})
                  </span>
                  <div className="mt-2 max-h-56 space-y-1 overflow-y-auto border border-border p-2">
                    {readyTraces.map((t) => (
                      <label
                        key={t.id}
                        className="flex cursor-pointer items-center gap-3 px-2 py-1.5 text-sm hover:bg-accent/50"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(t.id)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(t.id);
                            else next.delete(t.id);
                            setSelected(next);
                          }}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {t.task_desc ?? t.repo_url ?? t.id}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">{t.n_steps} steps</span>
                      </label>
                    ))}
                  </div>
                </div>
                {packMsg && <p className="mt-3 text-sm text-muted-foreground">{packMsg}</p>}
                <div className="mt-5 flex gap-3">
                  <Button
                    size="sm"
                    onClick={createPack}
                    disabled={packBusy || selected.size === 0 || !packTitle.trim()}
                  >
                    {packBusy ? "Creating…" : `Create draft pack (${selected.size})`}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {(packs ?? []).map((p) => (
                <div key={p.id} className="border border-border p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium text-balance">{p.title}</h3>
                    <Badge variant={p.status === "live" ? "default" : "outline"}>
                      {p.status === "live" ? "Live" : p.status === "draft" ? "Draft" : "Delisted"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground tabular-nums">
                    <span>{p.traces.length} traces</span>
                    <span>{money(p.price_cents)}</span>
                    <span>{p.license}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {p.status === "draft" && (
                      <Button size="sm" variant="outline" disabled={packBusy} onClick={() => packAction(p.id, "publish")}>
                        Publish to marketplace
                      </Button>
                    )}
                    {p.status === "live" && (
                      <>
                        <Button size="sm" variant="outline" asChild>
                          <a href={`/marketplace/${p.id}`}>View listing</a>
                        </Button>
                        <Button size="sm" variant="ghost" disabled={packBusy} onClick={() => packAction(p.id, "delist")}>
                          Delist
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {packs !== null && packs.length === 0 && !createOpen && (
                <p className="text-sm text-muted-foreground">
                  No packs yet. Create one from your Ready traces and publish it
                  to the public marketplace.
                </p>
              )}
            </div>
            {packMsg && !createOpen && <p className="mt-4 text-sm text-muted-foreground">{packMsg}</p>}
          </div>
        </div>
      </main>

      <footer>
        <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-muted-foreground">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2">
              <Wordmark />
              <span>© 2026</span>
              <span>·</span>
              <span>selling starts with a full vault</span>
            </div>
            <div className="flex gap-6">
              <Link to="/" className="hover:text-foreground">
                Homepage
              </Link>
              <a href="mailto:hello@opentraces.dev" className="hover:text-foreground">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Trace viewer (/dashboard/traces/:id)                               */
/* ------------------------------------------------------------------ */

type StepBlock = {
  type: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  arguments?: unknown;
};

type StepRow = {
  i: number;
  role: "user" | "assistant" | "tool_result";
  content: string | StepBlock[];
  model?: string;
  stop_reason?: string;
  tool_call_id?: string;
  tool_name?: string;
  is_error?: boolean;
  ts?: string;
  usage?: { cost_usd?: number; total_tokens?: number };
};

type TraceHeaderData = {
  agent?: { name?: string; model?: string; provider?: string };
  env?: { repo_url?: string | null; base_commit?: string | null; branch?: string | null; files_touched?: string[] };
  task?: { description?: string; source?: string };
  outcome?: { self_reported?: string };
  attestation?: { rights_holder?: boolean; license?: string; consent?: string };
  privacy?: { scrub?: string; secrets_removed?: number };
  usage?: { input?: number; output?: number; total_tokens?: number; cost_usd?: number };
};

type TraceDetailData = {
  trace: TraceRow & { scrub_report?: string | null; content_hash?: string | null };
  header: TraceHeaderData | null;
  steps: StepRow[];
  parse_error: string | null;
};

function MetaGrid({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <div className="text-[11px] font-medium tracking-[0.15em] text-muted-foreground uppercase">
            {k}
          </div>
          <div className="mt-1 truncate text-sm" title={typeof v === "string" ? v : undefined}>
            {v}
          </div>
        </div>
      ))}
    </div>
  );
}

function roleLabel(role: StepRow["role"]): string {
  if (role === "user") return "User";
  if (role === "assistant") return "Assistant";
  return "Tool result";
}

function TextBody({ text }: { text: string }) {
  return <p className="text-base leading-7 whitespace-pre-wrap text-foreground">{text}</p>;
}

function ThinkingBody({ thinking }: { thinking: string }) {
  return (
    <div className="rounded-lg bg-secondary px-4 py-3">
      <div className="text-[11px] font-medium tracking-[0.15em] text-muted-foreground uppercase">
        Thinking
      </div>
      <p className="mt-2 text-[15px] leading-7 whitespace-pre-wrap italic text-muted-foreground">
        {thinking}
      </p>
    </div>
  );
}

function ToolCallBody({ call }: { call: StepBlock }) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 shadow-lg shadow-neutral-900/10">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <span className="font-mono text-[13px] font-medium text-emerald-400">tool</span>
        <span className="font-mono text-[13px] font-medium text-neutral-100">{call.name}</span>
        <span className="ml-auto font-mono text-[11px] text-neutral-500">{call.id}</span>
      </div>
      <pre className="overflow-x-auto border-t border-neutral-800 px-4 py-3 font-mono text-[13px] leading-6 text-neutral-300">
        {JSON.stringify(call.arguments ?? {}, null, 2)}
      </pre>
    </div>
  );
}

function ToolResultBody({ step }: { step: StepRow }) {
  const blocks = Array.isArray(step.content) ? step.content : [];
  const text = blocks
    .map((b) => b.text ?? "")
    .filter(Boolean)
    .join("\n");
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        step.is_error ? "border-destructive/40 bg-destructive/5" : "border-border bg-secondary"
      )}
    >
      {step.is_error && (
        <div className="mb-1.5 text-[11px] font-medium tracking-[0.15em] text-destructive uppercase">
          Error
        </div>
      )}
      <pre className="overflow-x-auto font-mono text-[13px] leading-6 whitespace-pre-wrap text-foreground/80">
        {text || "(empty)"}
      </pre>
    </div>
  );
}

function StepCard({ step }: { step: StepRow }) {
  const blocks = Array.isArray(step.content) ? step.content : [];
  return (
    <div className="group flex gap-4 sm:gap-6">
      <div className="w-12 shrink-0 pt-0.5 text-right sm:w-16">
        <div className="font-mono text-[11px] text-muted-foreground/50 tabular-nums">
          {String(step.i).padStart(3, "0")}
        </div>
        <div
          className={cn(
            "mt-1 text-[11px] font-medium tracking-[0.15em] uppercase",
            step.role === "user" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {roleLabel(step.role).split(" ")[0]}
        </div>
        {step.role === "assistant" && step.usage?.total_tokens != null && (
          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/50 tabular-nums">
            {step.usage.total_tokens > 999
              ? `${(step.usage.total_tokens / 1000).toFixed(1)}k`
              : step.usage.total_tokens}{" "}
            tok
          </div>
        )}
      </div>
      <div className="relative min-w-0 flex-1 space-y-3 border-l border-border pb-1 pl-4 sm:pl-6">
        <button
          type="button"
          title="Copy step as JSON"
          onClick={() => navigator.clipboard.writeText(JSON.stringify(step, null, 2))}
          className="absolute top-0 right-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        {step.role === "user" && typeof step.content === "string" && <TextBody text={step.content} />}
        {blocks.map((b, j) => {
          if (b.type === "text" && b.text) return <TextBody key={j} text={b.text} />;
          if (b.type === "thinking" && b.thinking) return <ThinkingBody key={j} thinking={b.thinking} />;
          if (b.type === "toolCall") return <ToolCallBody key={j} call={b} />;
          return null;
        })}
        {step.role === "tool_result" && <ToolResultBody step={step} />}
      </div>
    </div>
  );
}

function TraceDetail({ id }: { id: string }) {
  const { getToken } = useAuth();
  const [data, setData] = useState<TraceDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(50);
  const [roleFilter, setRoleFilter] = useState<"all" | StepRow["role"]>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("no session");
        const res = await fetch(`${API_URL}/v1/traces/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`trace request failed (${res.status})`);
        const body = await res.json();
        if (!cancelled) setData(body);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "failed to load trace");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, id]);

  const t = data?.trace;
  const header = data?.header;
  const steps = data?.steps ?? [];
  const title = t?.task_desc ?? header?.task?.description ?? t?.repo_url ?? id;

  const filtered = steps.filter(
    (s) =>
      (roleFilter === "all" || s.role === roleFilter) &&
      (!query || JSON.stringify(s).toLowerCase().includes(query.toLowerCase()))
  );
  const roleCounts = {
    user: steps.filter((s) => s.role === "user").length,
    assistant: steps.filter((s) => s.role === "assistant").length,
    tool_result: steps.filter((s) => s.role === "tool_result").length,
  };
  const setRole = (r: typeof roleFilter) => {
    setRoleFilter(r);
    setVisible(50);
  };

  const meta: [string, React.ReactNode][] = [];
  if (t?.repo_url || header?.env?.repo_url)
    meta.push([
      "Repository",
      <span className="font-mono text-xs">
        {t?.repo_url ?? header?.env?.repo_url}
        {(t?.base_commit ?? header?.env?.base_commit) && (
          <span className="text-muted-foreground">
            @{(t?.base_commit ?? header?.env?.base_commit ?? "").slice(0, 7)}
          </span>
        )}
      </span>,
    ]);
  if (header?.env?.branch) meta.push(["Branch", <span className="font-mono text-xs">{header.env.branch}</span>]);
  if (header?.attestation?.license)
    meta.push(["License", <span className="font-mono text-xs">{header.attestation.license}</span>]);
  if (header?.outcome?.self_reported)
    meta.push(["Seller outcome", <span className="capitalize">{header.outcome.self_reported}</span>]);
  if (header?.usage?.total_tokens != null)
    meta.push(["Total tokens", <span className="tabular-nums">{header.usage.total_tokens.toLocaleString()}</span>]);
  if (header?.task?.source) meta.push(["Task source", header.task.source]);
  if (header?.privacy?.scrub)
    meta.push([
      "Scrub",
      <span>
        {header.privacy.scrub}
        {header.privacy.secrets_removed != null && header.privacy.secrets_removed > 0
          ? ` · ${header.privacy.secrets_removed} secrets removed`
          : ""}
      </span>,
    ]);
  if (t?.created_at) meta.push(["Uploaded", <span className="tabular-nums">{t.created_at.slice(0, 16)}</span>]);
  if (t?.id) meta.push(["Trace ID", <CopyChip text={t.id} display={t.id.slice(0, 14) + "…"} />]);
  if (t?.content_hash)
    meta.push(["Content hash", <CopyChip text={t.content_hash} display={t.content_hash.slice(0, 10) + "…"} />]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardNav />
      <main>
        <div className="border-b border-border">
          <div className="mx-auto max-w-3xl px-6 pt-10 pb-10">
            <Button variant="ghost" size="sm" className="-ml-2" asChild>
              <Link to="/dashboard">
                <ArrowRight className="rotate-180" />
                Back to vault
              </Link>
            </Button>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {title}
            </h1>
            {t ? (
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <StatusBadge status={t.status} />
                <span className="flex items-center gap-1.5">
                  <img src="/agents/pi.svg" alt="" className="h-3.5 w-3.5" />
                  {t.agent}
                </span>
                {t.model && <span className="font-mono text-xs">{t.model}</span>}
                <span className="tabular-nums">{t.n_steps} steps</span>
                {t.cost_usd != null && <span className="tabular-nums">${t.cost_usd.toFixed(2)}</span>}
                <span>{t.created_at.slice(0, 10)}</span>
                {(t.repo_url || header?.env?.repo_url) && (
                  <span className="font-mono text-xs">
                    {t.repo_url ?? header?.env?.repo_url}
                    {(t.base_commit || header?.env?.base_commit) != null && (
                      <span className="text-muted-foreground/60">
                        @{(t.base_commit ?? header?.env?.base_commit ?? "").slice(0, 7)}
                      </span>
                    )}
                  </span>
                )}
              </div>
            ) : null}
            {data?.parse_error && (
              <p className="mt-3 text-sm text-destructive">
                Stored blob could not be parsed: {data.parse_error}
              </p>
            )}
            {meta.length > 0 && (
              <div className="mt-6 border-t border-border pt-6">
                <MetaGrid items={meta} />
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-6 py-12">
          {error ? (
            <p className="text-center text-sm text-muted-foreground">Could not load this trace: {error}</p>
          ) : data === null ? (
            <p className="text-center text-sm text-muted-foreground">Loading trace…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(["all", "user", "assistant", "tool_result"] as const).map((r) => {
                    const count = r === "all" ? steps.length : roleCounts[r];
                    if (r !== "all" && count === 0) return null;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={cn(
                          "border px-2.5 py-1 text-xs transition-colors",
                          roleFilter === r
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-border text-muted-foreground hover:border-neutral-400"
                        )}
                      >
                        {r === "all" ? "All" : roleLabel(r)} {count}
                      </button>
                    );
                  })}
                </div>
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setVisible(50);
                  }}
                  placeholder="Search steps…"
                  className="w-44 border border-input bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground/60 focus:border-ring"
                />
              </div>
              <div className="mt-8 space-y-8">
                {filtered.slice(0, visible).map((s) => (
                  <StepCard key={s.i} step={s} />
                ))}
                {filtered.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    No steps match this filter.
                  </p>
                )}
              </div>
              {filtered.length > visible && (
                <div className="mt-6 text-center">
                  <Button variant="outline" onClick={() => setVisible((v) => v + 100)}>
                    Show {Math.min(100, filtered.length - visible)} more of {filtered.length} steps
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Marketplace — public pack index + detail                           */
/* ------------------------------------------------------------------ */

type PackRow = {
  id: string;
  title: string;
  tags: string[];
  license: string;
  price_cents: number;
  status: string;
  created_at: string;
  org_name: string;
  org_github_url?: string | null;
  trace_count: number;
  step_count: number;
};

type PackTrace = {
  id: string;
  agent: string;
  model: string | null;
  n_steps: number;
  cost_usd: number | null;
};

type MyPack = PackRow & { traces: { id: string; status: string; n_steps: number }[] };

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function PackCard({ pack, onOpen }: { pack: PackRow; onOpen?: (id: string) => void }) {
  return (
    <div
      onClick={() => onOpen?.(pack.id)}
      className={cn(
        "flex flex-col border border-border p-6 transition-colors",
        onOpen && "cursor-pointer hover:border-neutral-400"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-medium text-balance">{pack.title}</h3>
        <span className="shrink-0 text-lg font-semibold tabular-nums">{money(pack.price_cents)}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">by {pack.org_name}</div>
      {pack.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pack.tags.map((tag) => (
            <span key={tag} className="border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground tabular-nums">
        <span>{pack.trace_count} traces</span>
        <span>{pack.step_count.toLocaleString()} steps</span>
        <span className="ml-auto">{pack.license} license</span>
      </div>
    </div>
  );
}

function MarketplacePage() {
  const [packs, setPacks] = useState<PackRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/v1/packs`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setPacks(d.packs ?? []))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HowNav />
      <main>
        <div className="border-b border-border">
          <div className="mx-auto max-w-5xl px-6 pt-20 pb-20 text-center">
            <Eyebrow>Marketplace</Eyebrow>
            <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Verified agent traces, ready for training
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              Every pack is scrubbed, quality-gated, and pinned to real
              repositories. One open format, any agent, any model.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-6 py-16">
          {error ? (
            <p className="text-center text-sm text-muted-foreground">Could not load the marketplace.</p>
          ) : packs === null ? (
            <p className="text-center text-sm text-muted-foreground">Loading packs…</p>
          ) : packs.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">
                First packs are being curated right now. Check back shortly, or
                email labs@opentraces.dev for early access.
              </p>
              <div className="mt-6">
                <Button variant="outline" asChild>
                  <Link to="/">Back to homepage</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {packs.map((p) => (
                <MarketLink key={p.id} id={p.id}>
                  <PackCard pack={p} />
                </MarketLink>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function MarketLink({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <a
      href={`/marketplace/${id}`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigate(`/marketplace/${id}`);
      }}
      className="block"
    >
      {children}
    </a>
  );
}

function PackDetailPage({ id }: { id: string }) {
  const [data, setData] = useState<{ pack: PackRow; traces: PackTrace[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/v1/packs/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, [id]);

  const p = data?.pack;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HowNav />
      <main>
        <div className="border-b border-border">
          <div className="mx-auto max-w-4xl px-6 pt-10 pb-10">
            <Button variant="ghost" size="sm" className="-ml-2" asChild>
              <Link to="/marketplace">
                <ArrowRight className="rotate-180" />
                Marketplace
              </Link>
            </Button>
            {error ? (
              <p className="mt-6 text-sm text-muted-foreground">This pack is not available.</p>
            ) : data === null ? (
              <p className="mt-6 text-sm text-muted-foreground">Loading pack…</p>
            ) : p ? (
              <>
                <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                      {p.title}
                    </h1>
                    <div className="mt-1 text-sm text-muted-foreground">
                      by {p.org_name}
                      {p.org_github_url && (
                        <>
                          {" \u00b7 "}
                          <a
                            href={p.org_github_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-foreground underline-offset-4 hover:underline"
                            title="Verify the seller on GitHub"
                          >
                            GitHub profile ↗
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-2xl font-semibold tabular-nums">{money(p.price_cents)}</span>
                </div>
                {p.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.tags.map((tag) => (
                      <span key={tag} className="border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground tabular-nums">
                  <span>{p.trace_count} traces</span>
                  <span>{p.step_count.toLocaleString()} steps</span>
                  <span>{p.license} license</span>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {p && (
          <div className="mx-auto max-w-4xl px-6 py-12">
            <h2 className="text-sm font-medium">What is inside</h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Trace</th>
                    <th className="px-4 py-2.5 font-medium">Agent</th>
                    <th className="px-4 py-2.5 font-medium">Model</th>
                    <th className="px-4 py-2.5 text-right font-medium">Steps</th>
                  </tr>
                </thead>
                <tbody>
                  {data.traces.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{t.id}</td>
                      <td className="px-4 py-2.5">{t.agent}</td>
                      <td className="max-w-48 truncate px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {t.model ?? "–"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{t.n_steps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-10 rounded-xl border border-border p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">Buy this pack</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Checkout launches soon. For early access, email us and we
                    will set you up manually.
                  </p>
                </div>
                <Button asChild>
                  <a href={`mailto:labs@opentraces.dev?subject=Pack access: ${encodeURIComponent(p.title)}`}>
                    Buy for {money(p.price_cents)}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Device approval (/cli/auth) — CLI login lands here                 */
/* ------------------------------------------------------------------ */

const API_URL = import.meta.env.VITE_API_URL ?? "https://opentraces-api.lalitmadan.workers.dev";

function DeviceApprove() {
  const { isSignedIn } = useAuth();
  const { getToken } = useAuth();
  const { openSignIn } = useClerk();
  const [code] = useState(
    () => new URLSearchParams(window.location.search).get("user_code")?.toUpperCase() ?? ""
  );
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [typed, setTyped] = useState(code);
  const autoOpened = useRef(false);

  // Already-logged-in users land straight on Approve. Otherwise open the
  // sign-in modal automatically; a button stays as popup-blocker fallback.
  useEffect(() => {
    if (!isSignedIn && !autoOpened.current) {
      autoOpened.current = true;
      openSignIn();
    }
  }, [isSignedIn, openSignIn]);

  const approve = async () => {
    setState("working");
    setMessage("");
    try {
      const token = await getToken();
      if (!token) throw new Error("no session");
      const res = await fetch(`${API_URL}/v1/device/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_code: typed.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `failed (${res.status})`);
      }
      setState("done");
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "something went wrong");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-6">
          <Link to="/" aria-label="opentraces home">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="w-full max-w-md">
          <Eyebrow>Device login</Eyebrow>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Approve terminal login
          </h1>
          {state === "done" ? (
            <>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Approved. Return to your terminal, it is already logged in. You
                can close this window.
              </p>
              <div className="mt-8">
                <Button asChild>
                  <Link to="/dashboard">Go to your vault</Link>
                </Button>
              </div>
            </>
          ) : !isSignedIn ? (
            <>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Sign in to approve the login request from your terminal. The
                sign-in window should have opened; if your browser blocked it,
                use the button below.
              </p>
              <div className="mt-8">
                <Button onClick={() => openSignIn()}>Sign in to continue</Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Your terminal is asking to connect. Confirm the code below
                matches the one shown there, then approve.
              </p>
              {!code && (
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  maxLength={9}
                  className="mt-6 w-full border border-input bg-background px-3 py-2 font-mono text-lg tracking-[0.3em] outline-none focus:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              )}
              {message && <p className="mt-2 text-sm text-destructive">{message}</p>}
              <div className="mt-6">
                <Button onClick={approve} disabled={state === "working" || typed.length < 9}>
                  {state === "working" ? "Approving…" : "Approve login"}
                </Button>
              </div>
              <p className="mt-8 text-xs leading-5 text-muted-foreground">
                Approving creates an API key for your account. It is delivered
                straight to your terminal and never shown in the browser. The
                request expires in 10 minutes.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  /how — install & workflow guide                                    */
/* ------------------------------------------------------------------ */

function HowNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link to="/" aria-label="opentraces home">
          <Logo />
        </Link>
        <nav className="flex items-center">
          <Show when="signed-in">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          </Show>
          <Show when="signed-out">
            <SignInButtonMenu />
          </Show>
        </nav>
      </div>
    </header>
  );
}

function HowStep({
  n,
  title,
  body,
  terminal,
}: {
  n: string;
  title: string;
  body: React.ReactNode;
  terminal: string[];
}) {
  return (
    <div className="grid items-start gap-8 md:grid-cols-2 md:gap-12">
      <div>
        <div className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Step {n}
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h2>
        <div className="mt-3 text-sm leading-6 text-muted-foreground">{body}</div>
      </div>
      <Terminal lines={terminal} />
    </div>
  );
}

function HowPage() {
  const installCmd =
    "uv tool install 'opentraces @ git+https://github.com/madanlalit/opentraces#subdirectory=cli'";
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HowNav />

      <main>
        <div className="border-b border-border">
          <div className="mx-auto max-w-5xl px-6 pt-20 pb-20 text-center">
            <Eyebrow>Guide</Eyebrow>
            <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              How OpenTraces works
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              No AI expertise needed. If you can run one command, you can sell.
            </p>
          </div>
        </div>

        {/* what is a trace */}
        <div className="border-b border-border">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <Eyebrow>The basics</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              What is an agent trace?
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              Every time you work with a coding agent like pi, the whole
              session is saved on your computer: what you asked for, what the
              agent planned, the commands it ran, the files it changed, and how
              it knew it was done. That complete record is called a trace.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Think of it as the flight recorder of your development work, or
              the full recipe a chef used, not just the final dish.
            </p>
            <div className="mt-8 max-w-2xl overflow-hidden rounded-xl border border-border">
              {[
                ["You ask", "The login button does nothing on Safari"],
                ["Agent thinks", "Check auth.py, the click handler is missing"],
                ["Agent acts", "Edits two lines, runs the test suite"],
                ["Proof", "41 tests pass"],
                ["Result", "Bug fixed, every step recorded"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex gap-4 border-b border-border px-4 py-3 text-sm last:border-0"
                >
                  <span className="w-28 shrink-0 text-xs font-medium tracking-[0.15em] text-muted-foreground uppercase">
                    {k}
                  </span>
                  <span className="text-foreground/90">{v}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              That is a five step trace. Real sessions are often hundreds of
              steps long, and that depth is exactly what makes them valuable.
            </p>
          </div>
        </div>

        {/* why labs pay */}
        <div className="border-b border-border">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <Eyebrow>Why it sells</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              Why do labs pay for this?
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              AI labs are racing to make coding agents better. The best way to
              teach an agent is to show it thousands of real problems being
              solved for real: messy repositories, failing tests, careful
              fixes, actual tool calls. Textbook examples are everywhere.
              Real work is rare, and rare is valuable.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Think of how an apprentice learns: not from reading recipes, but
              from watching a chef cook. Your traces are the cooking.
            </p>
          </div>
        </div>

        {/* safety */}
        <div className="border-b border-border">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <Eyebrow>Safety</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              Your work, your terms
            </h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              <div>
                <h3 className="text-lg font-medium">You pick what leaves</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Nothing is uploaded automatically. You see the exact list of
                  sessions and choose which ones to sell.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium">Secrets never survive</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Passwords, API keys, and your personal file paths are removed
                  automatically before anything can be sold. Every trace ships
                  with a report of what was removed.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium">You keep 80%</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  You stay the owner: you license the data, you can stop
                  selling at any time, and you keep 80% of every sale.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* steps */}
        <div className="border-b border-border">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <Eyebrow>Do it</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              Four steps, about five minutes
            </h2>
            <div className="mt-12 space-y-16">
              <HowStep
                n="1"
                title="Install the CLI"
                body={
                  <p>
                    Copy one command into your terminal. It needs Python 3.10
                    or newer, and uv sets everything else up in its own
                    environment, so nothing about your system changes.
                  </p>
                }
                terminal={[installCmd, "ot version"]}
              />
              <HowStep
                n="2"
                title="Log in with one click"
                body={
                  <p>
                    <span className="font-mono text-xs">ot login</span> shows a
                    short code and opens your browser. You approve, and your
                    personal key is delivered straight to your terminal. It is
                    never shown on any web page.
                  </p>
                }
                terminal={["ot login", "ot whoami"]}
              />
              <HowStep
                n="3"
                title="Pick the sessions to sell"
                body={
                  <p>
                    <span className="font-mono text-xs">ot push</span> lists
                    your recent agent sessions in a table, like a menu. Each
                    row shows what the session did and how big it is. You pick
                    the lines you want and only those are uploaded.
                  </p>
                }
                terminal={["ot push", "ot push --all --limit 5"]}
              />
              <HowStep
                n="4"
                title="We clean it, you watch it turn Ready"
                body={
                  <p>
                    Our scrubber removes anything sensitive, checks quality,
                    and marks the trace Ready for sale. You see the status and
                    the full cleaning report in your dashboard. Nothing to do
                    but wait a minute.
                  </p>
                }
                terminal={["# watch your vault", "# Received \u2192 Cleaning \u2192 Ready"]}
              />
            </div>
          </div>
        </div>

        <div className="border-b border-border">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <Eyebrow>Trace statuses</Eyebrow>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">
              What each status means
            </h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              <div>
                <StatusBadge status="uploaded" />
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Arrived intact and stored. Waiting for the scrubber to pick
                  it up, usually under a minute.
                </p>
              </div>
              <div>
                <StatusBadge status="scrubbing" />
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Being cleaned: secrets redacted, paths anonymized, quality
                  gates running.
                </p>
              </div>
              <div>
                <StatusBadge status="scrubbed" />
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Training-ready. Cleaned, gated, and eligible for packs.
                  Rejected traces show the reason instead.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Section className="text-center">
          <h2 className="mx-auto max-w-xl text-3xl font-semibold tracking-tight text-balance">
            Turn yesterday's work into income.
          </h2>
          <div className="mt-8 flex justify-center">
            <PrimaryCta />
          </div>
        </Section>
      </main>

      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Routes                                                             */
/*  /           landing (sign-in via modal, sign-up via /sign-up)      */
/*  /sign-up    Clerk sign-up page; signed-in users go to /dashboard   */
/*  /cli/auth   approve a terminal login (device flow)                 */
/*  /dashboard  vault; signed-out users are redirected to sign-up      */
/* ------------------------------------------------------------------ */

function Routes() {
  const path = usePath();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  if (path === "/dashboard") {
    return isSignedIn ? <Dashboard /> : <RedirectToSignUp />;
  }

  const traceMatch = path.match(/^\/dashboard\/traces\/([A-Za-z0-9_]+)$/);
  if (traceMatch) {
    return isSignedIn ? <TraceDetail id={traceMatch[1]} /> : <RedirectToSignUp />;
  }

  if (path === "/sign-up") {
    return isSignedIn ? <Navigate to="/dashboard" /> : <SignUpPage />;
  }

  if (path === "/cli/auth") {
    return <DeviceApprove />;
  }

  if (path === "/how") {
    return <HowPage />;
  }

  if (path === "/marketplace") {
    return <MarketplacePage />;
  }

  const packMatch = path.match(/^\/marketplace\/([A-Za-z0-9_]+)$/);
  if (packMatch) {
    return <PackDetailPage id={packMatch[1]} />;
  }

  return <Landing />;
}

function RedirectToSignUp() {
  useEffect(() => {
    navigate("/sign-up");
  }, []);
  return null;
}

export default Routes;
