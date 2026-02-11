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
  const [chatKey, setChatKey] = useState(0); // Add key to force ChatBox remount

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
    setChatKey((prev) => prev + 1); // Force ChatBox to reset
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-background to-muted/20 text-foreground">
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
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(true)}
                className="hover:bg-muted"
              >
                <PanelRightOpen className="h-5 w-5" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎬</span>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Manimation
              </h1>
            </div>
          </div>
          <UserButton />
        </header>

        {/* Content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left – Chat */}
          <div className="w-[380px] min-w-[320px] border-r flex flex-col bg-background">
            <ChatBox
              key={chatKey}
              onVideoGenerated={handleVideoGenerated}
              onGenerationStart={handleGenerationStart}
              onGenerationError={handleGenerationError}
              activeJobId={activeJobId}
            />
          </div>

          {/* Right – Video */}
          <div className="flex-1 p-6 overflow-auto bg-gradient-to-br from-background to-muted/10">
            <VideoPlayer videoUrl={videoUrl} isLoading={isGenerating} />
          </div>
        </div>
      </div>
    </div>
  );
}
