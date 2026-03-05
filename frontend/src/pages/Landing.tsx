import { motion } from "framer-motion";
import { Play, Zap, RefreshCw, Sparkles, Key, Github } from "lucide-react";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    desc: "Powered by Groq's ultra-fast inference. Your animation starts rendering in seconds.",
  },
  {
    icon: RefreshCw,
    title: "Iterate & Refine",
    desc: "Not quite right? Send a follow-up message and the AI will adjust the animation.",
  },
  {
    icon: Sparkles,
    title: "Self-Healing Code",
    desc: "Built-in code review automatically fixes errors — up to 3 attempts per generation.",
  },
  {
    icon: Key,
    title: "Bring Your Own Key",
    desc: "Use your own API key for unlimited generations with any supported model.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 fill-primary text-primary" />
            <span className="font-display text-lg font-semibold text-foreground">Manimation</span>
          </div>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Play className="h-4 w-4 fill-primary text-primary" />
            Open App
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, oklch(0.72 0.16 55 / 30%), transparent)",
          }}
        />

        <div className="container relative z-10 text-center">
          <motion.h1
            className="font-display text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-7xl md:text-8xl"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            Text to{" "}
            <span className="bg-gradient-to-r from-primary to-[oklch(0.82_0.16_60)] bg-clip-text text-transparent">
              Animation
            </span>
            <br />
            in Seconds
          </motion.h1>

          <motion.p
            className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
          >
            Describe any animation in plain English. Our AI generates production-quality Manim videos
            — then lets you iterate until it's perfect.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
          >
            <Link
              to="/app"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:brightness-110"
            >
              <Sparkles className="h-4 w-4" />
              Open App
            </Link>
          </motion.div>

          <motion.p
            className="mt-4 text-sm text-muted-foreground"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
          >
            3 free Gemini requests · Unlimited Groq · No paid tier
          </motion.p>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
              >
                <f.icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border py-24">
        <div className="container text-center">
          <motion.h2
            className="font-display text-3xl font-bold text-foreground sm:text-4xl"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
          >
            How It Works
          </motion.h2>
          <div className="mt-16 grid gap-12 sm:grid-cols-3">
            {[
              { step: "01", title: "Describe", text: "Type what you want to animate in plain English." },
              { step: "02", title: "Generate", text: "AI writes Manim code and renders your video instantly." },
              { step: "03", title: "Iterate", text: "Refine with follow-up prompts until it's perfect." },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                className="flex flex-col items-center"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
              >
                <span className="font-display text-5xl font-bold text-primary/20">{s.step}</span>
                <h3 className="mt-4 font-display text-xl font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container flex flex-col items-center gap-4 text-center text-sm text-muted-foreground">
          <p>Built with Manim, FastAPI &amp; React</p>
          <a
            href="https://github.com/satvik-tan"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <Github className="h-4 w-4" />
            Built by Satvik Tandon
          </a>
        </div>
      </footer>
    </div>
  );
}

