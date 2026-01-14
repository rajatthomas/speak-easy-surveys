import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AIAvatar } from "@/components/AIAvatar";
import { VoiceButton } from "@/components/VoiceButton";
import { AudioWaveform } from "@/components/AudioWaveform";
import { TranscriptBubble } from "@/components/TranscriptBubble";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { QuickActions } from "@/components/QuickActions";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { ArrowLeft, MoreVertical, Loader2 } from "lucide-react";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { useSession } from "@/hooks/useSession";
import { useAuth } from "@/hooks/useAuth";

export default function ConversationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(15);
  const [isStarting, setIsStarting] = useState(false);
  const [partialAIResponse, setPartialAIResponse] = useState('');
  const hasInitializedSession = useRef(false);

  const { 
    currentSession, 
    startSession, 
    endSession, 
    saveMessage,
    getUserSessions,
  } = useSession();

  const [totalSessions, setTotalSessions] = useState(1);

  // Fetch total sessions count
  useEffect(() => {
    if (user) {
      getUserSessions().then(sessions => {
        setTotalSessions(Math.max(sessions.length, 1));
      });
    }
  }, [user, getUserSessions]);

  const handleMessageAdded = useCallback((text: string, sender: 'user' | 'ai') => {
    // Save message to database
    saveMessage(text, sender);
  }, [saveMessage]);

  const {
    messages,
    isConnected,
    aiState,
    currentTranscript,
    connect,
    disconnect,
  } = useRealtimeChat({
    onTranscriptUpdate: (transcript) => setPartialAIResponse(transcript),
    onMessageAdded: handleMessageAdded,
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update progress based on messages
  useEffect(() => {
    const messageCount = messages.filter(m => m.sender === 'user').length;
    setProgress(Math.min(15 + messageCount * 10, 95));
  }, [messages]);

  const handleStartConversation = async () => {
    setIsStarting(true);
    try {
      // Start a new session if we haven't already
      if (!currentSession && !hasInitializedSession.current) {
        hasInitializedSession.current = true;
        await startSession();
      }
      await connect();
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopConversation = async () => {
    disconnect();
    if (currentSession) {
      await endSession('completed');
      // Navigate to completion with session ID
      navigate(`/complete?session=${currentSession.id}`);
    } else {
      navigate('/complete');
    }
  };

  const handlePause = async () => {
    disconnect();
    if (currentSession) {
      await endSession('paused');
    }
    navigate("/paused");
  };

  const handleIssue = () => {
    alert("Options:\n• I can't hear you\n• You're not understanding me\n• Privacy concern\n\nPlease try again or contact support.");
  };

  const handleBack = async () => {
    disconnect();
    if (currentSession) {
      await endSession('paused');
    }
    navigate("/");
  };

  // Map aiState to avatar state
  const avatarState = aiState === 'connecting' ? 'thinking' : aiState;

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
        {/* AI Section */}
        <div className="flex flex-col items-center py-6 bg-gradient-to-b from-secondary/30 to-transparent">
          <AIAvatar state={avatarState} size="lg" />
          
          {/* AI Status */}
          <div className="mt-4 h-8 flex items-center justify-center">
            {aiState === 'connecting' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting...</span>
              </div>
            )}
            {aiState === 'speaking' && (
              <AudioWaveform isActive={true} variant="ai" />
            )}
            {aiState === 'thinking' && (
              <span className="text-sm text-muted-foreground animate-pulse">
                Thinking...
              </span>
            )}
            {aiState === 'listening' && isConnected && (
              <span className="text-sm text-primary font-medium">
                Listening...
              </span>
            )}
            {aiState === 'idle' && !isConnected && (
              <span className="text-sm text-muted-foreground">
                Tap the mic to start
              </span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && !isConnected && (
            <div className="text-center text-muted-foreground py-8">
              <p>Tap the microphone button below to start your conversation.</p>
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
          
          {/* Show real-time user transcription */}
          {currentTranscript && (
            <TranscriptBubble
              text={currentTranscript}
              sender="user"
              isComplete={false}
              className="opacity-70"
            />
          )}
          
          {/* Show partial AI response as it streams */}
          {partialAIResponse && aiState === 'speaking' && (
            <TranscriptBubble
              text={partialAIResponse}
              sender="ai"
              isComplete={false}
              className="opacity-70"
            />
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Voice Controls */}
        <div className="p-6 bg-card border-t border-border">
          <div className="flex flex-col items-center gap-4">
            {!isConnected ? (
              <button
                onClick={handleStartConversation}
                disabled={isStarting}
                className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
                  </svg>
                )}
              </button>
            ) : (
              <VoiceButton
                isListening={aiState === 'listening'}
                onStart={() => {}}
                onStop={handleStopConversation}
              />
            )}
            
            {isConnected && (
              <QuickActions onPause={handlePause} onIssue={handleIssue} />
            )}
          </div>
        </div>
      </main>

      {/* Privacy Footer */}
      <footer className="p-3 border-t border-border bg-card">
        <PrivacyBadge variant="minimal" className="justify-center" />
      </footer>
    </div>
  );
}
