import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl?: string;
  downloadUrl?: string;
  isLoading?: boolean;
}

export default function VideoPlayer({ 
  videoUrl, 
  downloadUrl, 
  isLoading = false 
}: VideoPlayerProps) {
  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Animation Preview</span>
          {isLoading && (
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center p-4">
        {videoUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <video 
              className="max-h-full max-w-full rounded shadow-lg"
              controls 
              autoPlay 
              loop
              src={videoUrl}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 rounded-lg">
            <p className="text-muted-foreground mb-2">
              {isLoading 
                ? "Generating your animation..." 
                : "Your animation will appear here"
              }
            </p>
            {isLoading && (
              <div className="h-2 w-64 bg-muted overflow-hidden rounded-full mt-4">
                <div className="h-full bg-primary animate-pulse"></div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      {downloadUrl && videoUrl && (
        <CardFooter className="border-t">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => window.open(downloadUrl, '_blank')}
          >
            <Download className="h-4 w-4" />
            <span>Download Animation</span>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}