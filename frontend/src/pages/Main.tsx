import { useState } from "react";
import { UserButton } from "@clerk/clerk-react";
import { Menu, ChartBar as BarChart3 } from "lucide-react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import ChatBox from "../components/ChatBox";
import SideBar from "../components/SideBar";
import VideoPlayer from "../components/VideoPlayer";
import type { JobResponse } from "../lib/api";

export default function Main() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJobCreatedAt, setActiveJobCreatedAt] = useState<string | undefined>(undefined);
  const [chatKey, setChatKey] = useState(0);

  const handleVideoGenerated = (url: string, _downloadUrl: string, jobId: string, createdAt: string) => {
    setVideoUrl(url);
    setActiveJobId(jobId);
    setActiveJobCreatedAt(createdAt);
    setIsGenerating(false);
  };

  const handleGenerationStart = () => {
    setIsGenerating(true);
    setVideoUrl(undefined);
  };

  const handleGenerationError = () => {
    setIsGenerating(false);
  };

  const handleSelectJob = (job: JobResponse) => {
    setActiveJobId(job.job_id);
    setVideoUrl(job.result_url ?? undefined);
    setActiveJobCreatedAt(job.created_at);
    setIsGenerating(false);
  };

  const handleNewChat = () => {
    setActiveJobId(null);
    setVideoUrl(undefined);
    setActiveJobCreatedAt(undefined);
    setIsGenerating(false);
    setChatKey((prev) => prev + 1);
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed lg:relative inset-y-0 left-0 z-40 w-64 shrink-0 overflow-hidden border-r-4 border-foreground bg-sidebar flex flex-col transition-[transform,width] duration-300 ${
          isSidebarOpen
            ? "translate-x-0 lg:w-64"
            : "-translate-x-full lg:translate-x-0 lg:w-0 lg:border-r-0"
        }`}
      >
        <SideBar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((open) => !open)}
          onSelectJob={handleSelectJob}
          onNewChat={handleNewChat}
          activeJobId={activeJobId}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b-4 border-foreground bg-card px-6 py-4 flex items-center justify-between min-h-20">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 border-2 border-foreground hover:bg-primary/20 text-foreground transition-colors"
                aria-label="Open sidebar"
                aria-expanded={isSidebarOpen}
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div className="w-6 h-6 border-2 border-primary bg-primary" />
            <h1 className="text-lg font-black font-display">MANIMATION</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="border-2 border-foreground font-bold"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">DASHBOARD</span>
            </Button>
            <UserButton />
          </div>
        </header>

        <div className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row">
          <div className="w-full lg:w-96 border-b-4 lg:border-b-0 lg:border-r-4 border-foreground flex flex-col bg-card overflow-hidden">
            <ChatBox
              key={chatKey}
              onVideoGenerated={handleVideoGenerated}
              onGenerationStart={handleGenerationStart}
              onGenerationError={handleGenerationError}
              activeJobId={activeJobId}
            />
          </div>

          <div className="flex-1 min-w-0 min-h-0 p-6 overflow-hidden bg-background">
            <VideoPlayer
              videoUrl={videoUrl}
              isLoading={isGenerating}
              jobId={activeJobId ?? undefined}
              createdAt={activeJobCreatedAt}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
