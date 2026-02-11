import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, ExternalLink } from "lucide-react";

interface VideoPlayerProps {
  videoUrl?: string;
  isLoading?: boolean;
}

export default function VideoPlayer({
  videoUrl,
  isLoading = false,
}: VideoPlayerProps) {
  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex justify-between items-center text-lg">
          <span>Animation Preview</span>
          {isLoading && (
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col items-center justify-center p-4">
        {videoUrl ? (
          <div className="w-full flex-1 flex items-center justify-center">
            <video
              className="max-h-full max-w-full rounded-lg shadow-lg"
              controls
              autoPlay
              loop
              src={videoUrl}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col items-center justify-center bg-muted/30 rounded-lg">
            <p className="text-muted-foreground mb-2 text-sm">
              {isLoading
                ? "Generating your animation…"
                : "Your animation will appear here"}
            </p>
            {isLoading && (
              <div className="h-1.5 w-48 bg-muted overflow-hidden rounded-full mt-3">
                <div className="h-full bg-primary animate-pulse" />
              </div>
            )}
          </div>
        )}
      </CardContent>

      {videoUrl && (
        <div className="border-t px-4 py-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => window.open(videoUrl, "_blank")}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => window.open(videoUrl, "_blank")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </Button>
        </div>
      )}
    </Card>
  );
}
