export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-6">
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Ory Auth App
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Self-service identity with Ory Kratos
        </h1>
        <p className="text-zinc-600 leading-relaxed">
          Demo Next.js app wired to a local Kratos stack (Docker Compose):
          login, registration, recovery, and social OIDC.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/login"
            className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Log in
          </a>
          <a
            href="/registration"
            className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-100"
          >
            Create account
          </a>
        </div>
        <p className="text-sm text-zinc-500">
          Start the identity stack with <code className="text-zinc-800">docker compose up -d</code>, then run{" "}
          <code className="text-zinc-800">npm run dev</code>.
        </p>
      </div>
    </main>
  );
}
