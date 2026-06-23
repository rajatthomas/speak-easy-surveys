import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AIAvatar } from "@/components/AIAvatar";
import { AudioWaveform } from "@/components/AudioWaveform";
import { TranscriptBubble } from "@/components/TranscriptBubble";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { QuickActions } from "@/components/QuickActions";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { ArrowLeft, MoreVertical, Loader2, Mic, Square } from "lucide-react";
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
  } = useVoiceConversation({ onMessageAdded: handleMessageAdded });

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
    state === 'listening' || state === 'user_speaking' ? 'listening' : 'idle';

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
            {state === 'user_speaking' && (
              <AudioWaveform isActive={true} variant="user" />
            )}
            {state === 'listening' && (
              <span className="text-sm text-primary font-medium">
                Listening…
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
              <p>Tap the microphone to start. Just speak naturally — I'll know when you're done.</p>
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
              >
                {state === 'loading' ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>
            ) : (
              <button
                onClick={handleStopConversation}
                className="w-20 h-20 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:bg-destructive/90 transition-all"
                aria-label="End conversation"
              >
                <Square className="w-8 h-8" />
              </button>
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
