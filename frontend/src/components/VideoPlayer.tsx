import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VideoPlayerProps {
  videoUrl?: string;
  downloadUrl?: string;
  isLoading?: boolean;
  code?: string; // Add code prop
}

export default function VideoPlayer({ 
  videoUrl, 
  downloadUrl, 
  isLoading = false,
  code // Destructure code prop
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
      <CardContent className="flex-1 flex flex-col items-center justify-center p-4">
        {videoUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <video 
              className="max-h-[70%] max-w-full rounded shadow-lg" // Adjusted max-h
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
        {/* Code display area */}
        {code && (
          <div className="w-full mt-4 p-4 border-t">
            <h3 className="text-lg font-semibold mb-2">Generated Code:</h3>
            <ScrollArea className="h-48 w-full bg-muted/50 p-2 rounded">
              <pre className="text-sm whitespace-pre-wrap">{code}</pre>
            </ScrollArea>
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