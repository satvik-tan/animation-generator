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
    <Card className="flex flex-col h-full w-full rounded-none border-0 border-r shadow-none">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <CardTitle className="text-lg font-semibold">
          {activeJobId ? "✏️ Iterate on Animation" : "✨ New Animation"}
        </CardTitle>
        {activeJobId && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            Describe what to change — the AI will modify the current animation.
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden bg-gradient-to-b from-background to-muted/5">
        <ScrollArea className="h-full px-4 py-4">
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="text-center pt-12 space-y-3">
                <div className="text-5xl">🎨</div>
                <p className="text-sm text-muted-foreground">
                  Describe the animation you want to create…
                </p>
                <div className="text-xs text-muted-foreground space-y-1 pt-2">
                  <p className="italic">Example: "A circle morphing into a square"</p>
                  <p className="italic">Example: "Show Pythagoras theorem with animation"</p>
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm shadow-sm ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted border border-border"
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

      <CardFooter className="p-4 border-t bg-muted/10">
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
            className="min-h-[56px] max-h-[120px] resize-none text-sm shadow-sm"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="h-[56px] w-[56px] shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
