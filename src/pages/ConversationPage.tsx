import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AIAvatar } from "@/components/AIAvatar";
import { AudioWaveform } from "@/components/AudioWaveform";
import { TranscriptBubble } from "@/components/TranscriptBubble";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { QuickActions } from "@/components/QuickActions";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { ArrowLeft, MoreVertical, Loader2, Mic, Square, Phone } from "lucide-react";
import { useVoiceConversation } from "@/hooks/useVoiceConversation";
import { useSession } from "@/hooks/useSession";
import { useAuth } from "@/hooks/useAuth";

export default function ConversationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(15);
  const hasInitializedSession = useRef(false);

  const { 
    currentSession, 
    startSession, 
    endSession, 
    saveMessage,
    getUserSessions,
  } = useSession();

  const [totalSessions, setTotalSessions] = useState(1);

  useEffect(() => {
    if (user) {
      getUserSessions().then(sessions => {
        setTotalSessions(Math.max(sessions.length, 1));
      });
    }
  }, [user, getUserSessions]);

  const handleMessageAdded = useCallback((text: string, sender: 'user' | 'ai') => {
    saveMessage(text, sender);
  }, [saveMessage]);

  const {
    state,
    messages,
    interimUser,
    interimAI,
    active,
    start,
    stop,
    toggleTalk,
  } = useVoiceConversation({
    onMessageAdded: handleMessageAdded,
    greeting: "Hi — I'm here whenever you're ready. How's work been going lately?",
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimUser, interimAI]);

  useEffect(() => {
    const messageCount = messages.filter(m => m.sender === 'user').length;
    setProgress(Math.min(15 + messageCount * 10, 95));
  }, [messages]);

  const handleStartConversation = async () => {
    if (!currentSession && !hasInitializedSession.current) {
      hasInitializedSession.current = true;
      await startSession();
    }
    await start();
  };

  const handleStopConversation = async () => {
    stop();
    if (currentSession) {
      await endSession('completed');
      navigate(`/complete?session=${currentSession.id}`);
    } else {
      navigate('/complete');
    }
  };

  const handlePause = async () => {
    stop();
    if (currentSession) {
      await endSession('paused');
    }
    navigate("/paused");
  };

  const handleIssue = () => {
    alert("Options:\n• I can't hear you\n• You're not understanding me\n• Privacy concern\n\nPlease try again or contact support.");
  };

  const handleBack = async () => {
    stop();
    if (currentSession) {
      await endSession('paused');
    }
    navigate("/");
  };

  const avatarState: 'idle' | 'listening' | 'speaking' | 'thinking' =
    state === 'speaking' ? 'speaking' :
    state === 'thinking' || state === 'transcribing' || state === 'loading' ? 'thinking' :
    state === 'recording' ? 'listening' : 'idle';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-card">
        <button
          onClick={handleBack}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        
        <ProgressIndicator
          currentSession={totalSessions}
          totalSessions={totalSessions}
          progress={progress}
          className="flex-1 max-w-xs mx-4"
        />
        
        <button className="p-2 rounded-full hover:bg-muted transition-colors">
          <MoreVertical className="w-5 h-5 text-muted-foreground" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-col items-center py-6 bg-gradient-to-b from-secondary/30 to-transparent">
          <AIAvatar state={avatarState} size="lg" />
          
          <div className="mt-4 h-8 flex items-center justify-center">
            {state === 'loading' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Warming up the microphone…</span>
              </div>
            )}
            {state === 'speaking' && (
              <AudioWaveform isActive={true} variant="ai" />
            )}
            {state === 'thinking' && (
              <span className="text-sm text-muted-foreground animate-pulse">
                Thinking...
              </span>
            )}
            {state === 'transcribing' && (
              <span className="text-sm text-muted-foreground animate-pulse">
                Transcribing…
              </span>
            )}
            {state === 'recording' && (
              <div className="flex items-center gap-2">
                <AudioWaveform isActive={true} variant="user" />
                <span className="text-sm text-destructive font-medium">Recording — tap to send</span>
              </div>
            )}
            {state === 'ready' && (
              <span className="text-sm text-primary font-medium">
                Tap the mic to talk
              </span>
            )}
            {state === 'idle' && !active && (
              <span className="text-sm text-muted-foreground">
                Tap the mic to start
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && !active && (
            <div className="text-center text-muted-foreground py-8">
              <p>Tap the microphone to start. Tap once to talk, tap again when you're done.</p>
            </div>
          )}
          
          {messages.map((message) => (
            <TranscriptBubble
              key={message.id}
              text={message.text}
              sender={message.sender}
              isComplete={true}
            />
          ))}
          
          {interimUser && (
            <TranscriptBubble
              text={interimUser}
              sender="user"
              isComplete={false}
              className="opacity-70"
            />
          )}
          
          {interimAI && (
            <TranscriptBubble
              text={interimAI}
              sender="ai"
              isComplete={false}
              className="opacity-70"
            />
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-card border-t border-border">
          <div className="flex flex-col items-center gap-4">
            {!active ? (
              <button
                onClick={handleStartConversation}
                disabled={state === 'loading'}
                className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Start conversation"
              >
                {state === 'loading' ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>
            ) : (
              <div className="flex items-center gap-6">
                <button
                  onClick={toggleTalk}
                  disabled={state === 'transcribing' || state === 'loading'}
                  className={
                    "w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed " +
                    (state === 'recording'
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-pulse"
                      : "bg-primary text-primary-foreground hover:bg-primary/90")
                  }
                  aria-label={state === 'recording' ? "Stop and send" : "Tap to talk"}
                >
                  {state === 'transcribing' || state === 'loading' ? (
                    <Loader2 className="w-9 h-9 animate-spin" />
                  ) : state === 'recording' ? (
                    <Square className="w-9 h-9" />
                  ) : (
                    <Mic className="w-9 h-9" />
                  )}
                </button>
                <button
                  onClick={handleStopConversation}
                  className="w-14 h-14 rounded-full bg-muted text-muted-foreground flex items-center justify-center shadow hover:bg-muted/80 transition-all"
                  aria-label="End conversation"
                >
                  <Phone className="w-6 h-6 rotate-[135deg]" />
                </button>
              </div>
            )}

            {active && (
              <QuickActions onPause={handlePause} onIssue={handleIssue} />
            )}
          </div>
        </div>
      </main>

      <footer className="p-3 border-t border-border bg-card">
        <PrivacyBadge variant="minimal" className="justify-center" />
      </footer>
    </div>
  );
}
