import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { createJob, pollJob } from "@/lib/api";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  jobId?: string;
}

interface ChatBoxProps {
  onVideoGenerated: (videoUrl: string, downloadUrl: string, jobId: string) => void;
  onGenerationStart: () => void;
  onGenerationError: (errorMessage: string) => void;
  /** The currently-displayed job (so we can iterate on it) */
  activeJobId?: string | null;
}

export default function ChatBox({
  onVideoGenerated,
  onGenerationStart,
  onGenerationError,
  activeJobId,
}: ChatBoxProps) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (text: string, sender: "user" | "bot", jobId?: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, sender, jobId },
    ]);
  };

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || isLoading) return;

    addMessage(prompt, "user");
    setInput("");
    setIsLoading(true);
    onGenerationStart();

    try {
      const token = await getToken();

      // If we have an active job, this is an iteration
      const parentId = activeJobId || undefined;

      // 1. Create job
      const created = await createJob(
        { prompt, parent_job_id: parentId ?? null },
        token
      );

      addMessage(
        parentId
          ? "✏️ Iterating on your animation…"
          : "🎬 Generating your animation…",
        "bot",
        created.job_id
      );

      // 2. Poll until done
      const finished = await pollJob(created.job_id, token, 2000, (_update) => {
        // Optional: could update a progress indicator here
      });

      if (finished.status === "completed" && finished.result_url) {
        addMessage("✅ Animation ready!", "bot", finished.job_id);
        onVideoGenerated(finished.result_url, finished.result_url, finished.job_id);
      } else {
        const err = finished.error_message || "Unknown error";
        addMessage(`❌ Generation failed: ${err}`, "bot", finished.job_id);
        onGenerationError(err);
      }
    } catch (err: any) {
      const msg = err.message || "Something went wrong";
      addMessage(`❌ Error: ${msg}`, "bot");
      onGenerationError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-full w-full rounded-none border-0 border-r">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {activeJobId ? "Iterate on Animation" : "New Animation"}
        </CardTitle>
        {activeJobId && (
          <p className="text-xs text-muted-foreground">
            Describe what to change — the AI will modify the current animation.
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-4 py-2">
          <div className="space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center pt-8">
                Describe the animation you want to create…
              </p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-3 border-t">
        <div className="flex w-full items-end gap-2">
          <Textarea
            placeholder={
              activeJobId
                ? "Describe what to change…"
                : "Describe the animation you want…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="min-h-[56px] max-h-[120px] resize-none text-sm"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
