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
import { Send, Loader2, X, Key, Sparkles } from "lucide-react";
import { createJob, pollJob, cancelJob } from "@/lib/api";
import {
  canCreateJob,
  incrementJobCount,
  getRemainingJobs,
  hasCustomGeminiKey,
  getCustomGeminiKey,
  setCustomGeminiKey,
  clearCustomGeminiKey,
  getSelectedModel,
  setSelectedModel,
  type ModelProvider,
} from "@/lib/userLimits";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  jobId?: string;
}

interface ChatBoxProps {
  onVideoGenerated: (videoUrl: string, downloadUrl: string, jobId: string, createdAt: string) => void;
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
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [isCancelCooldown, setIsCancelCooldown] = useState(false);
  const [selectedModel, setSelectedModelState] = useState<ModelProvider>(getSelectedModel());
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getCustomGeminiKey() || "");
  const [remainingJobs, setRemainingJobs] = useState(getRemainingJobs());
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

    // Check if user can create job
    const { canCreate, reason } = canCreateJob();
    if (!canCreate) {
      addMessage(reason || "Cannot create job", "bot");
      setShowApiKeyInput(true);
      return;
    }

    addMessage(prompt, "user");
    setInput("");
    setIsLoading(true);
    setCurrentJobId(null);
    onGenerationStart();

    try {
      const token = await getToken();

      // If we have an active job, this is an iteration
      const parentId = activeJobId || undefined;

      // Prepare request with custom API key if using Gemini
      const customKey = selectedModel === 'gemini' ? getCustomGeminiKey() : null;

      // 1. Create job
      const created = await createJob(
        { 
          prompt, 
          parent_job_id: parentId ?? null,
          custom_api_key: customKey,
          model_provider: selectedModel,
        },
        token
      );

      setCurrentJobId(created.job_id);

      // Increment count only for Gemini without custom key
      if (selectedModel === 'gemini' && !hasCustomGeminiKey()) {
        incrementJobCount();
        setRemainingJobs(getRemainingJobs());
      }

      addMessage(
        parentId
          ? "✏️ Iterating on your animation…"
          : "🎬 Generating your animation…",
        "bot",
        created.job_id
      );

      // 2. Poll until done
      const finished = await pollJob(created.job_id, getToken, 2000, (_update) => {
        // Optional: could update a progress indicator here
      });

      if (finished.status === "completed" && finished.result_url) {
        addMessage("✅ Animation ready!", "bot", finished.job_id);
        onVideoGenerated(finished.result_url, finished.result_url, finished.job_id, finished.created_at);
      } else if (finished.status === "cancelled") {
        addMessage("🚫 Generation cancelled.", "bot", finished.job_id);
        onGenerationError("Job was cancelled");
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
      setCurrentJobId(null);
    }
  };

  const handleCancel = async () => {
    if (!currentJobId || !isLoading || isCancelCooldown) return;

    setIsCancelCooldown(true);
    
    try {
      const token = await getToken();
      await cancelJob(currentJobId, token);
      addMessage("🚫 Cancelling generation…", "bot", currentJobId);
    } catch (err: any) {
      console.error("Failed to cancel job:", err);
      addMessage(`⚠️ Cancel request failed: ${err.message}`, "bot");
    }

    // 5 second cooldown
    setTimeout(() => {
      setIsCancelCooldown(false);
    }, 5000);
  };

  const handleModelChange = (model: ModelProvider) => {
    setSelectedModelState(model);
    setSelectedModel(model);
    setRemainingJobs(getRemainingJobs());
  };

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      setCustomGeminiKey(apiKeyInput.trim());
      setShowApiKeyInput(false);
      addMessage("✅ API key saved! You can now create unlimited animations with Gemini.", "bot");
    }
  };

  const handleClearApiKey = () => {
    clearCustomGeminiKey();
    setApiKeyInput("");
    setShowApiKeyInput(false);
    setRemainingJobs(getRemainingJobs());
    addMessage("🔑 API key cleared. Back to free tier (3 animations).", "bot");
  };

  return (
    <Card className="flex flex-col h-full w-full rounded-none border-0 border-r shadow-none">
      <CardHeader className="pb-3 border-b bg-muted/20 space-y-3">
        <CardTitle className="text-lg font-semibold">
          {activeJobId ? "✏️ Iterate on Animation" : "✨ New Animation"}
        </CardTitle>
        {activeJobId && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            Describe what to change — the AI will modify the current animation.
          </p>
        )}

        {/* Model Selector */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={selectedModel === 'gemini' ? 'default' : 'outline'}
            onClick={() => handleModelChange('gemini')}
            className="flex-1 gap-1.5"
            disabled={isLoading}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Gemini
          </Button>
          <Button
            size="sm"
            variant={selectedModel === 'groq' ? 'default' : 'outline'}
            onClick={() => handleModelChange('groq')}
            className="flex-1 gap-1.5"
            disabled={isLoading}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Groq
          </Button>
        </div>

        {/* Limit Info & API Key Button */}
        {selectedModel === 'gemini' && (
          <div className="flex items-center justify-between text-xs">
            {hasCustomGeminiKey() ? (
              <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                <Key className="h-3 w-3" />
                Using your API key
              </span>
            ) : (
              <span className="text-muted-foreground">
                {remainingJobs} free animations left
              </span>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="h-6 px-2 text-xs"
            >
              <Key className="h-3 w-3 mr-1" />
              {hasCustomGeminiKey() ? 'Manage Key' : 'Add Key'}
            </Button>
          </div>
        )}

        {/* API Key Input */}
        {showApiKeyInput && selectedModel === 'gemini' && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
            <label className="text-xs font-medium">Gemini API Key</label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter your Gemini API key..."
              className="w-full px-2 py-1.5 text-xs rounded border bg-background"
              disabled={isLoading}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim() || isLoading}
                className="flex-1 h-7 text-xs"
              >
                Save
              </Button>
              {hasCustomGeminiKey() && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleClearApiKey}
                  disabled={isLoading}
                  className="h-7 text-xs"
                >
                  Clear
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowApiKeyInput(false)}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Get your free API key at{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary"
              >
                Google AI Studio
              </a>
            </p>
          </div>
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
                  <p className="italic">Example: "Show Pythagorean theorem with animation"</p>
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
          {isLoading && currentJobId ? (
            <Button
              size="icon"
              variant="destructive"
              onClick={handleCancel}
              disabled={isCancelCooldown}
              className="h-[56px] w-[56px] shadow-sm cursor-pointer"
            >
              <X className="h-5 w-5" />
            </Button>
          ) : (
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
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
