import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AIAvatar } from "@/components/AIAvatar";
import { VoiceButton } from "@/components/VoiceButton";
import { AudioWaveform } from "@/components/AudioWaveform";
import { TranscriptBubble } from "@/components/TranscriptBubble";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { QuickActions } from "@/components/QuickActions";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { ArrowLeft, MoreVertical } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

const INITIAL_AI_MESSAGE = `Hi! I'm your AI conversation partner for this feedback session. Before we start, a few quick things: You can speak naturally like we're having coffee. If you need a break, just say "pause" and I'll remember where we left off. Your responses are private and anonymous. Sound good?`;

const SAMPLE_RESPONSES = [
  "That's interesting — tell me more about that experience.",
  "I hear you. What made you feel that way?",
  "Can you give me an example of when that happened?",
  "That makes sense. How did that affect your day-to-day work?",
  "I appreciate you sharing that. What would you change if you could?",
];

export default function ConversationPage() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [isListening, setIsListening] = useState(false);
  const [aiState, setAiState] = useState<"idle" | "listening" | "speaking" | "thinking">("idle");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: INITIAL_AI_MESSAGE,
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [progress, setProgress] = useState(15);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Simulate AI speaking on initial load
  useEffect(() => {
    setAiState("speaking");
    const timer = setTimeout(() => setAiState("idle"), 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleStartListening = () => {
    setIsListening(true);
    setAiState("listening");
    setCurrentTranscript("");
    
    // Simulate speech recognition
    const phrases = [
      "Well, ",
      "Well, I think ",
      "Well, I think overall ",
      "Well, I think overall things are ",
      "Well, I think overall things are going okay. ",
      "Well, I think overall things are going okay. Some days ",
      "Well, I think overall things are going okay. Some days are better ",
      "Well, I think overall things are going okay. Some days are better than others, ",
      "Well, I think overall things are going okay. Some days are better than others, you know?",
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < phrases.length) {
        setCurrentTranscript(phrases[index]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  };

  const handleStopListening = () => {
    setIsListening(false);
    
    if (currentTranscript) {
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        text: currentTranscript,
        sender: "user",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setCurrentTranscript("");
      
      // AI thinking
      setAiState("thinking");
      
      // AI responds after a delay
      setTimeout(() => {
        setAiState("speaking");
        const randomResponse = SAMPLE_RESPONSES[Math.floor(Math.random() * SAMPLE_RESPONSES.length)];
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: randomResponse,
          sender: "ai",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        setProgress((prev) => Math.min(prev + 8, 95));
        
        setTimeout(() => setAiState("idle"), 2000);
      }, 1500);
    } else {
      setAiState("idle");
    }
  };

  const handlePause = () => {
    navigate("/paused");
  };

  const handleIssue = () => {
    // Show issue modal (simplified for MVP)
    alert("Options:\n• I can't hear you\n• You're not understanding me\n• Privacy concern\n\nPlease try again or contact support.");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-card">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        
        <ProgressIndicator
          currentSession={1}
          totalSessions={3}
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
          <AIAvatar state={aiState} size="lg" />
          
          {/* AI Status */}
          <div className="mt-4 h-8 flex items-center justify-center">
            {aiState === "speaking" && (
              <AudioWaveform isActive={true} variant="ai" />
            )}
            {aiState === "thinking" && (
              <span className="text-sm text-muted-foreground animate-pulse">
                Thinking...
              </span>
            )}
            {aiState === "listening" && (
              <span className="text-sm text-primary font-medium">
                Listening...
              </span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((message) => (
            <TranscriptBubble
              key={message.id}
              text={message.text}
              sender={message.sender}
              isComplete={message.sender === "user"}
            />
          ))}
          
          {/* Live transcription */}
          {currentTranscript && (
            <div className="max-w-[85%] ml-auto rounded-2xl rounded-br-md px-4 py-3 bg-primary/80 text-primary-foreground">
              <p className="text-sm">{currentTranscript}</p>
              <AudioWaveform isActive={isListening} variant="user" className="mt-2" />
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Voice Controls */}
        <div className="p-6 bg-card border-t border-border">
          <div className="flex flex-col items-center gap-4">
            <VoiceButton
              isListening={isListening}
              onStart={handleStartListening}
              onStop={handleStopListening}
            />
            
            <QuickActions onPause={handlePause} onIssue={handleIssue} />
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
