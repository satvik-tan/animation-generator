import { useState } from "react";
import { UserButton } from "@clerk/clerk-react";
import { Menu, X, BarChart3 } from "lucide-react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import ChatBox from "../components/ChatBox";
import SideBar from "../components/SideBar";
import VideoPlayer from "../components/VideoPlayer";
import type { JobResponse } from "../lib/api";

export default function Main() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  const handleGenerationError = (_msg: string) => {
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
    <div className="flex h-screen bg-white">
      {/* Sidebar - Mobile overlay or desktop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <div
        className={`fixed lg:relative lg:translate-x-0 inset-y-0 left-0 z-40 w-64 border-r border-gray-200 bg-white flex flex-col transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <SideBar
          isOpen={true}
          onToggle={() => setIsSidebarOpen(false)}
          onSelectJob={handleSelectJob}
          onNewChat={handleNewChat}
          activeJobId={activeJobId}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white px-4 sm:px-6 py-4 flex items-center justify-between min-h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded"
            >
              {isSidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <svg className="h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 3 20 12 6 21 6 3"></polyline>
            </svg>
            <h1 className="text-base sm:text-lg font-semibold text-gray-900">Manimation</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Dashboard</span>
            </Button>
            <UserButton />
          </div>
        </header>

        {/* Content area */}
        <div className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row">
          {/* Chat - Left on desktop, top on mobile */}
          <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col bg-white overflow-hidden">
            <ChatBox
              key={chatKey}
              onVideoGenerated={handleVideoGenerated}
              onGenerationStart={handleGenerationStart}
              onGenerationError={handleGenerationError}
              activeJobId={activeJobId}
            />
          </div>

          {/* Video - Right on desktop, bottom on mobile */}
          <div className="flex-1 min-w-0 min-h-0 p-4 sm:p-6 overflow-hidden bg-white">
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
