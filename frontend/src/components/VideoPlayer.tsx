import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";

interface VideoPlayerProps {
  videoUrl?: string;
  isLoading?: boolean;
}

export default function VideoPlayer({
  videoUrl,
  isLoading = false,
}: VideoPlayerProps) {
  const [progress, setProgress] = useState(0);

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
    } else if (videoUrl) {
      // Instantly fill to 100% when video arrives
      setProgress(100);
    }
  }, [isLoading, videoUrl]);

  return (
    <Card className="w-full h-full flex flex-col shadow-sm">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <CardTitle className="flex justify-between items-center text-lg">
          <span className="font-semibold">Animation Preview</span>
          {isLoading && (
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col items-center justify-center p-6">
        {videoUrl ? (
          <div className="w-full flex-1 flex items-center justify-center">
            <video
              className="max-h-full max-w-full rounded-lg shadow-2xl border border-border"
              controls
              autoPlay
              loop
              src={videoUrl}
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

      {videoUrl && (
        <div className="border-t px-4 py-3 flex gap-2 bg-muted/10">
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => window.open(videoUrl, "_blank")}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => window.open(videoUrl, "_blank")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in New Tab
          </Button>
        </div>
      )}
    </Card>
  );
}
