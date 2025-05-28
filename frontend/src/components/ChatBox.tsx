import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area'; // For scrollable chat messages

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

interface ChatBoxProps {
  onVideoGenerated: (videoUrl: string, downloadUrl: string, code: string) => void;
  onGenerationStart: () => void;
  onGenerationError: (errorMessage: string) => void;
}

export default function ChatBox({ 
  onVideoGenerated, 
  onGenerationStart, 
  onGenerationError 
}: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (input.trim() === '') return;

    const userMessage: Message = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    onGenerationStart(); // Notify parent that generation has started

    // Simulate API call
    try {
      // Simulate fetching data from the backend
      // In a real scenario, this would be an API call:
      // const response = await fetch('/api/generate-animation', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ prompt: userMessage.text, class_name: "MyScene" }), // Ensure class_name is provided or handled
      // });
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.detail || 'Failed to generate animation');
      // }
      // const data = await response.json();
      
      // SIMULATED DATA
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
      const simulatedCode = `from manim import *\n\nclass MyScene(Scene):\n    def construct(self):\n        circle = Circle()\n        self.play(Create(circle))`;
      const simulatedVideoUrl = "/placeholder.mp4"; // Replace with actual URL from backend
      const simulatedDownloadUrl = "/placeholder.mp4"; // Replace with actual URL from backend


      const botMessage: Message = { 
        id: (Date.now() + 1).toString(), 
        text: `Generated animation for: "${userMessage.text}"`, 
        sender: 'bot' 
      };
      setMessages((prev) => [...prev, botMessage]);
      
      // Pass all data to parent
      onVideoGenerated(simulatedVideoUrl, simulatedDownloadUrl, simulatedCode);

    } catch (error: any) {
      const errorMessage = error.message || "An unknown error occurred";
      const errorBotMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Error: ${errorMessage}`,
        sender: 'bot',
      };
      setMessages((prev) => [...prev, errorBotMessage]);
      onGenerationError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-full w-full rounded-none border-0 border-r">
      <CardHeader>
        <CardTitle>Animation Prompt</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full p-6">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <div className="flex w-full items-center space-x-2">
          <Textarea
            placeholder="Describe the animation you want to create..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Send'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}