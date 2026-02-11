import { useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Play, Sparkles, Zap, RefreshCw } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Nav */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">Manimation</span>
        </div>

        <div>
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Button size="sm" onClick={() => navigate("/app")}>
              Open App
            </Button>
          </SignedIn>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Text to{" "}
            <span className="text-primary">Animation</span>
            <br />
            in Seconds
          </h1>

          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Describe any animation in plain English. Our AI generates
            production-quality Manim videos — then lets you iterate until it's
            perfect.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <SignedOut>
              <SignInButton mode="modal">
                <Button size="lg" className="gap-2">
                  <Sparkles className="h-5 w-5" />
                  Get Started — Free
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Button size="lg" className="gap-2" onClick={() => navigate("/app")}>
                <Sparkles className="h-5 w-5" />
                Open App
              </Button>
            </SignedIn>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-20 max-w-4xl w-full">
          <FeatureCard
            icon={<Zap className="h-8 w-8 text-primary" />}
            title="Lightning Fast"
            description="Powered by Groq's ultra-fast inference. Your animation starts rendering in seconds."
          />
          <FeatureCard
            icon={<RefreshCw className="h-8 w-8 text-primary" />}
            title="Iterate & Refine"
            description="Not quite right? Send a follow-up message and the AI will adjust the animation."
          />
          <FeatureCard
            icon={<Sparkles className="h-8 w-8 text-primary" />}
            title="Self-Healing Code"
            description="Built-in code review automatically fixes errors — up to 3 attempts per generation."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        Built with Manim, FastAPI &amp; React
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border p-6 text-left space-y-3 bg-card">
      {icon}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
