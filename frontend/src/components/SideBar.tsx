import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PanelLeftClose, Plus, CircleCheck as CheckCircle2, Circle as XCircle, Loader as Loader2, Clock } from "lucide-react";
import { listJobs, type JobResponse } from "@/lib/api";

interface SideBarProps {
  isOpen: boolean;
  onToggle: () => void;
  onSelectJob: (job: JobResponse) => void;
  onNewChat: () => void;
  activeJobId?: string | null;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />,
  failed: <XCircle className="h-4 w-4 text-red-400 shrink-0" />,
  cancelled: <XCircle className="h-4 w-4 text-orange-400 shrink-0" />,
  processing: <Loader2 className="h-4 w-4 animate-spin text-foreground shrink-0" />,
  queued: <Clock className="h-4 w-4 text-muted-foreground shrink-0" />,
};

export default function SideBar({
  isOpen,
  onToggle,
  onSelectJob,
  onNewChat,
  activeJobId,
}: SideBarProps) {
  const { getToken } = useAuth();
  const [jobs, setJobs] = useState<JobResponse[]>([]);

  const loadJobs = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await listJobs(token);
      setJobs(data);
    } catch {
      /* silent */
    }
  }, [getToken]);

  useEffect(() => {
    if (isOpen) loadJobs();
    const id = isOpen ? setInterval(loadJobs, 10_000) : undefined;
    return () => clearInterval(id);
  }, [isOpen, loadJobs]);

  if (!isOpen) return null;

  return (
    <Card className="h-full w-64 border-0 rounded-none flex flex-col shadow-none bg-sidebar text-sidebar-foreground">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b-2 border-foreground bg-sidebar">
        <CardTitle className="text-sm font-black font-display tracking-wide">HISTORY</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 hover:bg-primary/20 text-foreground"
          aria-label="Close sidebar"
        >
          <PanelLeftClose className="h-5 w-5" />
        </Button>
      </CardHeader>

      <div className="px-4 py-3 border-b-2 border-foreground bg-sidebar">
        <Button
          variant="default"
          size="sm"
          className="w-full gap-2 text-xs font-bold h-9 border-2 border-primary"
          onClick={onNewChat}
        >
          <Plus className="h-4 w-4" />
          NEW ANIMATION
        </Button>
      </div>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-4 py-3">
          <div className="space-y-2">
            {jobs.length === 0 && (
              <div className="text-center py-12 space-y-2">
                <p className="text-xs text-muted-foreground font-mono">→ No animations yet</p>
              </div>
            )}
            {jobs.map((job) => (
              <button
                key={job.job_id}
                onClick={() => onSelectJob(job)}
                className={`w-full text-left p-3 text-xs flex items-start gap-2 transition-all border-2 ${
                  activeJobId === job.job_id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-foreground bg-background text-foreground hover:bg-primary/10"
                }`}
              >
                {STATUS_ICON[job.status]}
                <span className="line-clamp-2 leading-tight flex-1 font-mono text-xs">
                  {job.prompt || "Untitled"}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
