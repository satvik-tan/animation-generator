import { useState } from "react";
import { UserButton } from "@clerk/clerk-react";
import { PanelRightOpen } from "lucide-react";
import { Button } from "../components/ui/button";
import ChatBox from "../components/ChatBox";
import SideBar from "../components/SideBar";
import VideoPlayer from "../components/VideoPlayer";
import type { JobResponse } from "../lib/api";

export default function Main() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const handleVideoGenerated = (url: string, _downloadUrl: string, jobId: string) => {
    setVideoUrl(url);
    setActiveJobId(jobId);
    setIsGenerating(false);
  };

  const handleGenerationStart = () => {
    setIsGenerating(true);
    setVideoUrl(undefined);
  };

  const handleGenerationError = (_msg: string) => {
    setIsGenerating(false);
  };

  const handleSelectJob = (job: JobResponse) => {
    setActiveJobId(job.job_id);
    setVideoUrl(job.result_url ?? undefined);
    setIsGenerating(false);
  };

  const handleNewChat = () => {
    setActiveJobId(null);
    setVideoUrl(undefined);
    setIsGenerating(false);
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <SideBar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(false)}
        onSelectJob={handleSelectJob}
        onNewChat={handleNewChat}
        activeJobId={activeJobId}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(true)}
              >
                <PanelRightOpen className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-lg font-bold">Manimation</h1>
          </div>
          <UserButton />
        </header>

        {/* Content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left – Chat */}
          <div className="w-[380px] min-w-[320px] border-r flex flex-col">
            <ChatBox
              onVideoGenerated={handleVideoGenerated}
              onGenerationStart={handleGenerationStart}
              onGenerationError={handleGenerationError}
              activeJobId={activeJobId}
            />
          </div>

          {/* Right – Video */}
          <div className="flex-1 p-4 overflow-auto">
            <VideoPlayer videoUrl={videoUrl} isLoading={isGenerating} />
          </div>
        </div>
      </div>
    </div>
  );
}
