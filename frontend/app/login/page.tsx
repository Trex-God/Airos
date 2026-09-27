import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full gap-10 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-cyan-950/20 lg:grid-cols-[0.9fr_1fr] lg:p-10">
          <div className="flex flex-col justify-between gap-10">
            <a href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300 font-black text-slate-950">
                AR
              </span>
              <span>
                <span className="block text-sm font-semibold leading-none">
                  AI-ROS
                </span>
                <span className="text-xs text-slate-500">
                  Research Operating System
                </span>
              </span>
            </a>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
                Secure sign in
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                Start free, then land in your workspace.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">
                Sign in with Clerk to access your AI-ROS dashboard, run tasks,
                view history, and manage your saved memory.
              </p>
            </div>

            <p className="text-xs text-slate-600">
              Protected by Clerk. AI-ROS never stores passwords.
            </p>
          </div>

          <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-white/10 bg-slate-950/70 p-4">
            <SignIn
              routing="hash"
              signInUrl="/login"
              signUpUrl="/login"
              forceRedirectUrl="/dashboard"
              signUpForceRedirectUrl="/dashboard"
              appearance={{
                variables: {
                  colorPrimary: "#3b82f6",
                  colorBackground: "#0f172a",
                  colorText: "#f8fafc",
                  colorTextSecondary: "#94a3b8",
                  colorInputBackground: "#020617",
                  colorInputText: "#f8fafc",
                },
                elements: {
                  rootBox: "mx-auto w-full",
                  cardBox: "mx-auto w-full",
                  card:
                    "border border-white/10 bg-slate-900 shadow-none",
                  headerTitle: "text-white",
                  headerSubtitle: "text-slate-400",
                  socialButtonsBlockButton:
                    "border-white/10 bg-slate-950 text-white hover:bg-slate-800",
                  formButtonPrimary:
                    "bg-cyan-300 text-slate-950 hover:bg-cyan-200",
                  formFieldInput:
                    "border-white/10 bg-slate-950 text-white",
                  footerActionText: "text-slate-400",
                  footerActionLink: "text-cyan-300",
                },
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
