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
  completed: <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />,
  failed: <XCircle className="h-4 w-4 text-red-600 shrink-0" />,
  cancelled: <XCircle className="h-4 w-4 text-orange-600 shrink-0" />,
  processing: <Loader2 className="h-4 w-4 animate-spin text-gray-900 shrink-0" />,
  queued: <Clock className="h-4 w-4 text-gray-600 shrink-0" />,
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
    <Card className="h-full w-full border-r border-gray-200 rounded-none flex flex-col shadow-none bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-gray-200 bg-gray-50">
        <CardTitle className="text-base font-semibold text-gray-900">History</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 hover:bg-gray-200"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </CardHeader>

      <div className="px-3 py-3 border-b border-gray-200 bg-white">
        <Button
          variant="default"
          size="sm"
          className="w-full gap-2 text-sm font-medium h-9"
          onClick={onNewChat}
        >
          <Plus className="h-4 w-4" />
          New Animation
        </Button>
      </div>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-3 py-3">
          <div className="space-y-2">
            {jobs.length === 0 && (
              <div className="text-center py-8 space-y-2">
                <p className="text-xs text-gray-600">No animations yet</p>
              </div>
            )}
            {jobs.map((job) => (
              <button
                key={job.job_id}
                onClick={() => onSelectJob(job)}
                className={`w-full text-left p-3 rounded text-xs flex items-start gap-2 transition-all hover:bg-gray-100 ${
                  activeJobId === job.job_id 
                    ? "bg-gray-100 border border-gray-300" 
                    : "border border-gray-200 hover:border-gray-300"
                }`}
              >
                {STATUS_ICON[job.status]}
                <span className="line-clamp-2 leading-tight flex-1 text-gray-900">
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
