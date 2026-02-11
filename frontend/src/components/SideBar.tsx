import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PanelLeftClose,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { listJobs, type JobResponse } from "@/lib/api";

interface SideBarProps {
  isOpen: boolean;
  onToggle: () => void;
  onSelectJob: (job: JobResponse) => void;
  onNewChat: () => void;
  activeJobId?: string | null;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />,
  failed: <XCircle className="h-3 w-3 text-destructive shrink-0" />,
  processing: <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />,
  queued: <Clock className="h-3 w-3 text-muted-foreground shrink-0" />,
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

  const loadJobs = async () => {
    try {
      const token = await getToken();
      const data = await listJobs(token);
      setJobs(data);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    if (isOpen) loadJobs();
    const id = isOpen ? setInterval(loadJobs, 10_000) : undefined;
    return () => clearInterval(id);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Card className="h-full w-64 border-r rounded-none flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">History</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-7 w-7"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </CardHeader>

      <div className="px-4 pb-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1 text-xs"
          onClick={onNewChat}
        >
          <Plus className="h-3 w-3" />
          New Animation
        </Button>
      </div>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-3 pb-3">
          <div className="space-y-1">
            {jobs.length === 0 && (
              <p className="text-xs text-muted-foreground text-center pt-4">
                No animations yet
              </p>
            )}
            {jobs.map((job) => (
              <button
                key={job.job_id}
                onClick={() => onSelectJob(job)}
                className={`w-full text-left p-2 rounded-md text-xs flex items-start gap-2 transition-colors hover:bg-accent ${
                  activeJobId === job.job_id ? "bg-accent" : ""
                }`}
              >
                {STATUS_ICON[job.status]}
                <span className="line-clamp-2 leading-tight">
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
