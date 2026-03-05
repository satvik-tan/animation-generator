import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error("404 – route not found:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 font-display text-6xl font-bold text-primary">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Page not found</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
