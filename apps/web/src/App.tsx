import { Show, useClerk, UserButton } from "@clerk/react";
import { ArrowRight } from "lucide-react";
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

function StartSellingButton() {
  const { openSignIn } = useClerk();
  return (
    <Button size="lg" onClick={() => openSignIn()} className="group">
      Start selling
      <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
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

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2" aria-label="opentraces home">
          <Logo />
        </a>
        <nav className="flex items-center">
          <SignInButtonMenu />
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
          Your agent already did the work.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-pretty text-muted-foreground">
          OpenTraces turns your coding agent sessions into training data that
          labs pay for. Push a session, we clean and check it, and you keep 80%
          of every sale.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <StartSellingButton />
          <Button variant="outline" size="lg" asChild>
            <a href="#how">How it works</a>
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
        <StartSellingButton />
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
            <a href="#how" className="hover:text-foreground">
              How it works
            </a>
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
/*  Dashboard (placeholder until the vault slice)                      */
/* ------------------------------------------------------------------ */

function Dashboard() {
  return (
    <div className="min-h-screen bg-background p-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">OpenTraces</h1>
          <p className="text-sm text-muted-foreground">Seller vault</p>
        </div>
        {/* v6: sign-out redirect is configured on ClerkProvider afterSignOutUrl */}
        <UserButton />
      </header>

      <section className="mt-10 rounded-xl border border-border bg-secondary p-6">
        <h2 className="font-medium">Vault</h2>
        <p className="mt-2 text-sm text-muted-foreground">
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
