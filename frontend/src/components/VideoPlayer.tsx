import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, AlertCircle } from "lucide-react";
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

  // Sync prop changes to state — clear any previous error when a new URL arrives
  useEffect(() => {
    setCurrentVideoUrl(videoUrl);
    setShowExpiredWarning(false);
  }, [videoUrl]);

  // Animate progress bar when loading
  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          // Slow progress that approaches 90% but never reaches 100%
          const increment = (90 - prev) * 0.05;
          return Math.min(prev + increment, 90);
        });
      }, 100);
      return () => clearInterval(interval);
    } else if (currentVideoUrl) {
      // Instantly fill to 100% when video arrives
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
        // Force the video element to reload with the new src
        // (browser may have cached the failed/expired request)
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.load();
            videoRef.current.play().catch(() => {
              // Autoplay may be blocked by browser — user can press play manually
            });
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
    <Card className="w-full h-full flex flex-col shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b bg-muted/20 shrink-0">
        <CardTitle className="flex justify-between items-center text-lg">
          <span className="font-semibold">Animation Preview</span>
          {isLoading && (
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 overflow-hidden">
        {showExpiredWarning && (
          <div className="w-full mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2 text-sm shrink-0">
            <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0" />
            <span className="text-yellow-700 dark:text-yellow-300 flex-1">
              Video URL may have expired. Click refresh to get a new link.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshUrl}
              disabled={isRefreshing}
              className="shrink-0"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        )}

        {currentVideoUrl ? (
          <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full rounded-lg shadow-2xl border border-border object-contain"
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
          <div className="w-full flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg border-2 border-dashed border-border p-8">
            <div className="text-center space-y-4 max-w-md">
              <div className="text-4xl mb-4">🎬</div>
              <p className="text-muted-foreground text-base font-medium">
                {isLoading
                  ? "Generating your animation…"
                  : "Your animation will appear here"}
              </p>
              {isLoading && (
                <div className="w-full max-w-xs mx-auto space-y-2">
                  <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This may take 30-60 seconds…
                  </p>
                </div>
              )}
              {!isLoading && (
                <p className="text-sm text-muted-foreground">
                  Describe an animation in the chat to get started
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {currentVideoUrl && (
        <div className="border-t px-4 py-3 flex gap-2 bg-muted/10">
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 text-xs"
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
                // Fallback to direct link
                const a = document.createElement('a');
                a.href = currentVideoUrl;
                a.download = `animation-${jobId || 'video'}.mp4`;
                a.click();
              }
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Download Video
          </Button>
          {showExpiredWarning && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs ml-auto"
              onClick={handleRefreshUrl}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh Link
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
