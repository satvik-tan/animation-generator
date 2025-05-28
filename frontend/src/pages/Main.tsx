import React, { useState } from 'react';
import { PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChatBox from '@/components/ChatBox';
import SideBar from '@/components/SideBar';
import VideoPlayer from '@/components/VideoPlayer';
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea

// Define an interface for ChatBox props to pass down
interface ChatBoxProps {
  onVideoGenerated: (videoUrl: string, downloadUrl: string, code: string) => void; // Add code to signature
  onGenerationStart: () => void;
  onGenerationError: (errorMessage: string) => void;
}

// Extend ChatBox component with these props
const ChatBoxWithCallback = (props: ChatBoxProps) => {
  // This is just a temporary wrapper until you update your actual ChatBox component
  return <ChatBox {...props as any} />;
};

export default function Main() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const [downloadUrl, setDownloadUrl] = useState<string | undefined>(undefined);
  const [generatedCode, setGeneratedCode] = useState<string | undefined>(undefined); // Add state for code
  const [isGenerating, setIsGenerating] = useState(false);

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleVideoGenerated = (videoUrl: string, downloadUrl: string, code: string) => { // Add code to params
    setVideoUrl(videoUrl);
    setDownloadUrl(downloadUrl);
    setGeneratedCode(code); // Set the code
    setIsGenerating(false);
  };

  const handleGenerationStart = () => {
    setIsGenerating(true);
    // Reset any previous video and code
    setVideoUrl(undefined);
    setDownloadUrl(undefined);
    setGeneratedCode(undefined); // Reset code
  };

  const handleGenerationError = (errorMessage: string) => {
    console.error('Generation error:', errorMessage);
    setIsGenerating(false);
    // You might want to show an error message to the user
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      {isSidebarOpen && (
        <div className="h-full">
          <SideBar isOpen={isSidebarOpen} onToggle={handleToggleSidebar} />
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center">
            {!isSidebarOpen && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleToggleSidebar}
                className="mr-2"
              >
                <PanelRightOpen className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-xl font-bold">Manim Animation Generator</h1>
          </div>
          <div>
            {/* Add any header controls here */}
          </div>
        </header>

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel - Chat */}
          <div className="w-1/3 border-r flex flex-col">
            <ChatBoxWithCallback
              onVideoGenerated={handleVideoGenerated}
              onGenerationStart={handleGenerationStart}
              onGenerationError={handleGenerationError}
            />
          </div>

          {/* Right panel - Video player */}
          <div className="w-2/3 p-4 bg-background/5 overflow-auto">
            <VideoPlayer 
              videoUrl={videoUrl} 
              downloadUrl={downloadUrl}
              isLoading={isGenerating}
              code={generatedCode} // Pass code to VideoPlayer
            />
          </div>
        </div>
      </div>
    </div>
  );
}