import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const features = [
  {
    title: "FAST GENERATION",
    desc: "Describe your animation. AI generates it in seconds.",
  },
  {
    title: "ITERATE & REFINE",
    desc: "Not right? Adjust with follow-up messages until perfect.",
  },
  {
    title: "ERROR HANDLING",
    desc: "Automatic code review fixes errors for you.",
  },
  {
    title: "CUSTOM KEYS",
    desc: "Use your own API key for unlimited generations.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 z-50 w-full border-b-4 border-foreground bg-background">
        <div className="max-w-7xl mx-auto flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-3 border-primary bg-primary" />
            <span className="text-lg font-bold font-display">MANIMATION</span>
          </div>
          <Link
            to="/app"
            className="px-6 py-3 text-sm font-bold font-display bg-primary text-primary-foreground border-2 border-primary hover:bg-primary-foreground hover:text-primary transition-all"
          >
            OPEN APP
          </Link>
        </div>
      </nav>

      <section className="flex min-h-screen items-center justify-center pt-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-64 h-64 border-4 border-primary/20" />
          <div className="absolute bottom-40 right-20 w-96 h-96 border-4 border-primary/10" />
        </div>

        <div className="max-w-4xl w-full text-center">
          <div className="inline-block mb-8 border-4 border-primary bg-primary/5 px-6 py-3">
            <p className="text-sm font-bold font-display tracking-wider">AI-POWERED ANIMATION</p>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black font-display leading-tight mb-6 tracking-tighter">
            TEXT TO<br />
            <span className="text-primary">ANIMATION</span><br />
            IN SECONDS
          </h1>

          <p className="mt-8 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Describe any animation in plain English. Our AI generates production-quality Manim videos — then lets you iterate until it's perfect.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/app"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary text-primary-foreground font-bold font-display border-3 border-primary hover:bg-primary-foreground hover:text-primary transition-all active:translate-y-1"
            >
              START CREATING
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <p className="mt-8 text-sm font-mono text-muted-foreground">
            3 free Gemini requests · Unlimited Groq · No paid tier
          </p>
        </div>
      </section>

      <section className="py-24 px-6 border-t-4 border-foreground bg-card">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-black font-display mb-16 tracking-tight">FEATURES</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-8 border-3 border-foreground bg-background hover:bg-primary/5 transition-all active:translate-y-1"
              >
                <div className="w-12 h-12 border-3 border-primary mb-4" />
                <h3 className="text-sm font-black font-display tracking-wide">{f.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t-4 border-foreground py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-black font-display mb-20 tracking-tight">HOW IT WORKS</h2>
          <div className="grid gap-12 sm:grid-cols-3">
            {[
              { step: "01", title: "DESCRIBE", text: "Type what you want to animate in plain English." },
              { step: "02", title: "GENERATE", text: "AI writes Manim code and renders your video instantly." },
              { step: "03", title: "ITERATE", text: "Refine with follow-up prompts until it's perfect." },
            ].map((s, i) => (
              <div key={s.step} className="flex flex-col">
                <div className="text-6xl font-black font-display text-primary mb-6">{s.step}</div>
                <h3 className="text-xl font-black font-display tracking-wide mb-3">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
                {i < 2 && <div className="hidden sm:block absolute left-1/3 translate-x-1/2 w-1 h-1 bg-primary mt-8" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t-4 border-foreground py-16 px-6 bg-card">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6 text-center">
          <div className="h-1 w-24 bg-primary" />
          <p className="text-sm font-mono text-muted-foreground">Built with Manim, FastAPI &amp; React</p>
        </div>
      </footer>
    </div>
  );
}
