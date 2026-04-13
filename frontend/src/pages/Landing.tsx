import { Link } from "react-router-dom";

const features = [
  {
    title: "Fast Generation",
    desc: "Describe your animation. AI generates it in seconds.",
  },
  {
    title: "Iterate & Refine",
    desc: "Not right? Adjust with follow-up messages until perfect.",
  },
  {
    title: "Error Handling",
    desc: "Automatic code review fixes errors for you.",
  },
  {
    title: "Custom Keys",
    desc: "Use your own API key for unlimited generations.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border bg-card">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 3 20 12 6 21 6 3"></polyline>
            </svg>
            <span className="text-base sm:text-lg font-semibold text-foreground">Manimation</span>
          </div>
          <Link
            to="/app"
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded hover:bg-primary/90 transition-colors"
          >
            Open App
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex min-h-screen items-center justify-center pt-16 px-4 sm:px-6">
        <div className="max-w-3xl text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-foreground">
            Text to Animation in Seconds
          </h1>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Describe any animation in plain English. Our AI generates production-quality Manim videos — then lets you iterate until it's perfect.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/app"
              className="px-6 py-3 text-sm font-semibold text-primary-foreground bg-primary rounded hover:bg-primary/90 transition-colors"
            >
              Open App
            </Link>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            3 free Gemini requests · Unlimited Groq · No paid tier
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="p-6 border border-border rounded bg-card hover:border-primary/50 transition-colors">
                <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">How It Works</h2>
          <div className="mt-16 grid gap-12 sm:grid-cols-3">
            {[
              { step: "01", title: "Describe", text: "Type what you want to animate in plain English." },
              { step: "02", title: "Generate", text: "AI writes Manim code and renders your video instantly." },
              { step: "03", title: "Iterate", text: "Refine with follow-up prompts until it's perfect." },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center">
                <span className="text-5xl font-bold text-muted">{s.step}</span>
                <h3 className="mt-4 text-xl font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-4 text-center text-sm text-muted-foreground">
          <p>Built with Manim, FastAPI &amp; React</p>
        </div>
      </footer>
    </div>
  );
}
