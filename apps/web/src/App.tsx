import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-10 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">OpenTraces</h1>
      <p className="max-w-xl text-neutral-400">
        Turn your coding agent's traces into training data. Sell what your agent
        already produced — pi first, more agents soon.
      </p>
      <SignInButton mode="modal">
        <button className="rounded-lg bg-white px-5 py-2.5 font-medium text-neutral-900 hover:bg-neutral-200">
          Start selling
        </button>
      </SignInButton>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="min-h-screen p-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">OpenTraces</h1>
          <p className="text-sm text-neutral-500">Seller vault</p>
        </div>
        <UserButton afterSignOutUrl="/" />
      </header>

      <section className="mt-10 rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
        <h2 className="font-medium">Vault</h2>
        <p className="mt-2 text-sm text-neutral-400">
          No traces yet. From your machine run:
        </p>
        <pre className="mt-3 rounded-lg bg-black p-4 text-sm text-neutral-300">
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
      <SignedOut>
        <Landing />
      </SignedOut>
      <SignedIn>
        <Dashboard />
      </SignedIn>
    </>
  );
}
