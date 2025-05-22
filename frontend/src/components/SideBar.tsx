import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PanelLeftClose } from 'lucide-react';

interface SideBarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function SideBar({ isOpen, onToggle }: SideBarProps) {
  if (!isOpen) return null; // Don't render if closed

  return (
    <Card className="h-full w-64 border-r rounded-none relative">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-md font-medium">Animation History</CardTitle>
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8">
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Recent animations will appear here
          </p>
          
          {/* Example history items */}
          <div className="space-y-2">
            {['Bouncing ball', 'Rotating cube', 'Growing flower'].map((title, index) => (
              <div 
                key={index} 
                className="p-2 hover:bg-accent rounded cursor-pointer text-sm flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span>{title}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}