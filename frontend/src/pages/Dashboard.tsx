import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listJobs } from "@/lib/api";
import type { JobResponse } from "@/lib/api";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  TrendingUp,
  Activity,
  BarChart3,
  ArrowLeft,
} from "lucide-react";

interface JobStats {
  total: number;
  completed: number;
  failed: number;
  cancelled: number;
  processing: number;
  queued: number;
  successRate: number;
  failureRate: number;
}

export default function Dashboard() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<JobStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<JobResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = await getToken();
      const jobs = await listJobs(token);

      // Calculate stats
      const total = jobs.length;
      const completed = jobs.filter((j) => j.status === "completed").length;
      const failed = jobs.filter((j) => j.status === "failed").length;
      const cancelled = jobs.filter((j) => j.status === "cancelled").length;
      const processing = jobs.filter((j) => j.status === "processing").length;
      const queued = jobs.filter((j) => j.status === "queued").length;

      const finishedJobs = completed + failed + cancelled;
      const successRate = finishedJobs > 0 ? (completed / finishedJobs) * 100 : 0;
      const failureRate = finishedJobs > 0 ? (failed / finishedJobs) * 100 : 0;

      setStats({
        total,
        completed,
        failed,
        cancelled,
        processing,
        queued,
        successRate,
        failureRate,
      });

      // Get 10 most recent jobs
      setRecentJobs(
        [...jobs]
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          .slice(0, 10)
      );
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-auto bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/app")}
              className="hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Activity className="h-8 w-8 text-primary" />
                Dashboard
              </h1>
              <p className="text-muted-foreground">
                Overview of your animation generation statistics
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Jobs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Total Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All time generations
              </p>
            </CardContent>
          </Card>

          {/* Success Rate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats.successRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.completed} completed jobs
              </p>
            </CardContent>
          </Card>

          {/* Active Jobs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4" />
                Active Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {stats.processing + stats.queued}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.processing} processing, {stats.queued} queued
              </p>
            </CardContent>
          </Card>

          {/* Failed Jobs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Failed Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {stats.failed}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.failureRate.toFixed(1)}% failure rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <StatusBar
                label="Completed"
                count={stats.completed}
                total={stats.total}
                color="bg-green-500"
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
              <StatusBar
                label="Failed"
                count={stats.failed}
                total={stats.total}
                color="bg-red-500"
                icon={<XCircle className="h-4 w-4" />}
              />
              <StatusBar
                label="Cancelled"
                count={stats.cancelled}
                total={stats.total}
                color="bg-orange-500"
                icon={<XCircle className="h-4 w-4" />}
              />
              <StatusBar
                label="Processing"
                count={stats.processing}
                total={stats.total}
                color="bg-blue-500"
                icon={<Loader2 className="h-4 w-4" />}
              />
              <StatusBar
                label="Queued"
                count={stats.queued}
                total={stats.total}
                color="bg-gray-500"
                icon={<Clock className="h-4 w-4" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No jobs yet. Create your first animation!
                </p>
              ) : (
                recentJobs.map((job) => (
                  <div
                    key={job.job_id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <StatusIcon status={job.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {job.prompt || "No prompt"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(job.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(
                          job.status
                        )}`}
                      >
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBar({
  label,
  count,
  total,
  color,
  icon,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  icon: React.ReactNode;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <span className="text-muted-foreground">
          {count} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  const icons: Record<string, React.ReactNode> = {
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-red-500" />,
    cancelled: <XCircle className="h-4 w-4 text-orange-500" />,
    processing: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
    queued: <Clock className="h-4 w-4 text-gray-500" />,
  };

  return icons[status] || <Activity className="h-4 w-4 text-muted-foreground" />;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: "bg-green-500/10 text-green-700 dark:text-green-400",
    failed: "bg-red-500/10 text-red-700 dark:text-red-400",
    cancelled: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    processing: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    queued: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  };

  return colors[status] || "bg-muted text-muted-foreground";
}
