import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, CircleAlert as AlertCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { regenerateVideoUrl } from "@/lib/api";

interface VideoPlayerProps {
  videoUrl?: string;
  isLoading?: boolean;
  jobId?: string;
  createdAt?: string;
}

export default function VideoPlayer({
  videoUrl,
  isLoading = false,
  jobId,
}: VideoPlayerProps) {
  const { getToken } = useAuth();
  const [progress, setProgress] = useState(0);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExpiredWarning, setShowExpiredWarning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setCurrentVideoUrl(videoUrl);
    setShowExpiredWarning(false);
  }, [videoUrl]);

  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          const increment = (90 - prev) * 0.05;
          return Math.min(prev + increment, 90);
        });
      }, 100);
      return () => clearInterval(interval);
    } else if (currentVideoUrl) {
      setProgress(100);
    }
  }, [isLoading, currentVideoUrl]);

  const handleRefreshUrl = async () => {
    if (!jobId) return;
    setIsRefreshing(true);
    try {
      const token = await getToken();
      const updated = await regenerateVideoUrl(jobId, token);
      if (updated.result_url) {
        setCurrentVideoUrl(updated.result_url);
        setShowExpiredWarning(false);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.load();
            videoRef.current.play().catch(() => {});
          }
        }, 50);
      }
    } catch (err) {
      console.error("Failed to refresh URL:", err);
      setShowExpiredWarning(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card className="w-full h-full flex flex-col shadow-none overflow-hidden border-2 border-foreground bg-card">
      <CardHeader className="pb-4 border-b-2 border-foreground shrink-0 bg-card">
        <CardTitle className="flex justify-between items-center text-sm font-black font-display tracking-wide">
          <span>ANIMATION PREVIEW</span>
          {isLoading && (
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 overflow-hidden">
        {showExpiredWarning && (
          <div className="w-full mb-4 p-4 bg-background border-2 border-primary flex items-center gap-2 text-sm shrink-0">
            <AlertCircle className="h-5 w-5 text-primary shrink-0" />
            <span className="text-foreground flex-1 text-xs sm:text-sm font-mono">
              Video URL expired. Click refresh for a new link.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshUrl}
              disabled={isRefreshing}
              className="shrink-0 h-8 text-xs font-bold border-2"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                  REFRESHING
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  REFRESH
                </>
              )}
            </Button>
          </div>
        )}

        {currentVideoUrl ? (
          <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden border-2 border-foreground">
            <video
              ref={videoRef}
              className="w-full h-full object-contain bg-black"
              controls
              autoPlay
              loop
              src={currentVideoUrl}
              onError={() => {
                setShowExpiredWarning(true);
              }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col items-center justify-center bg-background border-2 border-foreground p-6">
            <div className="text-center space-y-6 max-w-md">
              <p className="text-foreground text-sm sm:text-base font-black font-display">
                {isLoading
                  ? "GENERATING ANIMATION…"
                  : "YOUR ANIMATION WILL APPEAR HERE"}
              </p>
              {isLoading && (
                <div className="w-full max-w-xs mx-auto space-y-3">
                  <div className="h-3 w-full bg-muted border-2 border-foreground overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    → This may take 30-60 seconds
                  </p>
                </div>
              )}
              {!isLoading && (
                <p className="text-xs sm:text-sm text-muted-foreground font-mono">
                  → Describe an animation in the chat to get started
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {currentVideoUrl && (
        <div className="border-t-2 border-foreground px-6 py-4 flex gap-2 bg-card">
          <Button
            variant="default"
            size="sm"
            className="gap-2 text-xs h-9 font-bold border-2 border-primary"
            onClick={async () => {
              try {
                const response = await fetch(currentVideoUrl);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `animation-${jobId || 'video'}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              } catch (err) {
                console.error('Download failed:', err);
                const a = document.createElement('a');
                a.href = currentVideoUrl;
                a.download = `animation-${jobId || 'video'}.mp4`;
                a.click();
              }
            }}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">DOWNLOAD</span>
          </Button>
          {showExpiredWarning && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs ml-auto h-9 font-bold border-2"
              onClick={handleRefreshUrl}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">REFRESH LINK</span>
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
