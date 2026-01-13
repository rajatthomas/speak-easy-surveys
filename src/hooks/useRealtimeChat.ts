import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export type AIState = 'idle' | 'listening' | 'speaking' | 'thinking' | 'connecting';

interface UseRealtimeChatOptions {
  onTranscriptUpdate?: (transcript: string) => void;
  onAIStateChange?: (state: AIState) => void;
}

export function useRealtimeChat(options: UseRealtimeChatOptions = {}) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [aiState, setAIState] = useState<AIState>('idle');
  const [currentTranscript, setCurrentTranscript] = useState('');
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const partialTranscriptRef = useRef('');

  const updateAIState = useCallback((state: AIState) => {
    setAIState(state);
    options.onAIStateChange?.(state);
  }, [options]);

  const addMessage = useCallback((text: string, sender: 'user' | 'ai') => {
    const message: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
    return message;
  }, []);

  const connect = useCallback(async () => {
    try {
      updateAIState('connecting');
      console.log('Requesting ephemeral token...');

      // Get ephemeral token from edge function
      const { data, error } = await supabase.functions.invoke('realtime-session', {
        body: { voice: 'alloy' }
      });

      if (error) {
        throw new Error(error.message || 'Failed to get session token');
      }

      if (!data?.client_secret?.value) {
        throw new Error('Invalid session response - no client secret');
      }

      const ephemeralKey = data.client_secret.value;
      console.log('Got ephemeral token, setting up WebRTC...');

      // Create audio element for playback
      audioElRef.current = document.createElement('audio');
      audioElRef.current.autoplay = true;

      // Create peer connection
      pcRef.current = new RTCPeerConnection();

      // Set up remote audio
      pcRef.current.ontrack = (e) => {
        console.log('Received remote audio track');
        if (audioElRef.current) {
          audioElRef.current.srcObject = e.streams[0];
        }
      };

      // Add local audio track
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;
      pcRef.current.addTrack(stream.getTracks()[0]);

      // Set up data channel for events
      dcRef.current = pcRef.current.createDataChannel('oai-events');
      
      dcRef.current.addEventListener('open', () => {
        console.log('Data channel opened');
        setIsConnected(true);
        updateAIState('listening');
        
        // Send initial greeting after connection
        addMessage("Hi! I'm your AI conversation partner for this feedback session. Before we start, a few quick things: You can speak naturally like we're having coffee. If you need a break, just say \"pause\" and I'll remember where we left off. Your responses are private and anonymous. Sound good?", 'ai');
      });

      dcRef.current.addEventListener('message', (e) => {
        const event = JSON.parse(e.data);
        handleServerEvent(event);
      });

      dcRef.current.addEventListener('close', () => {
        console.log('Data channel closed');
        setIsConnected(false);
        updateAIState('idle');
      });

      // Create and set local description
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      // Connect to OpenAI Realtime API
      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp'
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`Failed to connect to OpenAI: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      await pcRef.current.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      console.log('WebRTC connection established');

    } catch (error) {
      console.error('Connection error:', error);
      updateAIState('idle');
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Could not connect to voice service',
        variant: 'destructive',
      });
      throw error;
    }
  }, [updateAIState, addMessage, toast]);

  const handleServerEvent = useCallback((event: any) => {
    console.log('Server event:', event.type, event);

    switch (event.type) {
      case 'session.created':
        console.log('Session created');
        break;

      case 'input_audio_buffer.speech_started':
        updateAIState('listening');
        partialTranscriptRef.current = '';
        setCurrentTranscript('');
        break;

      case 'input_audio_buffer.speech_stopped':
        updateAIState('thinking');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          addMessage(event.transcript, 'user');
          setCurrentTranscript('');
        }
        break;

      case 'conversation.item.input_audio_transcription.failed':
        console.error('Transcription failed:', event.error);
        if (event.error?.message?.includes('429') || event.error?.code === 'rate_limit_exceeded') {
          toast({
            title: 'Transcription Unavailable',
            description: 'Voice transcription temporarily unavailable due to rate limits.',
            variant: 'destructive',
          });
        }
        break;

      case 'response.audio_transcript.delta':
        partialTranscriptRef.current += event.delta || '';
        options.onTranscriptUpdate?.(partialTranscriptRef.current);
        break;

      case 'response.audio.delta':
        updateAIState('speaking');
        break;

      case 'response.audio_transcript.done':
        if (partialTranscriptRef.current) {
          addMessage(partialTranscriptRef.current, 'ai');
          partialTranscriptRef.current = '';
        }
        break;

      case 'response.done':
        // Check for failed response due to quota
        if (event.response?.status === 'failed') {
          const error = event.response.status_details?.error;
          if (error?.code === 'insufficient_quota') {
            toast({
              title: 'Quota Exceeded',
              description: 'The AI service has reached its usage limit. Please add credits to your OpenAI account.',
              variant: 'destructive',
            });
          } else if (error?.code === 'rate_limit_exceeded') {
            toast({
              title: 'Rate Limited',
              description: 'Too many requests. Please wait a moment and try again.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Response Failed',
              description: error?.message || 'Failed to generate response',
              variant: 'destructive',
            });
          }
        }
        updateAIState('listening');
        break;

      case 'error':
        console.error('OpenAI error:', event.error);
        const errorCode = event.error?.code;
        if (errorCode === 'insufficient_quota') {
          toast({
            title: 'Quota Exceeded',
            description: 'The AI service has reached its usage limit. Please add credits to your OpenAI account.',
            variant: 'destructive',
          });
        } else if (errorCode === 'rate_limit_exceeded') {
          toast({
            title: 'Rate Limited',
            description: 'Too many requests. Please wait a moment and try again.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: event.error?.message || 'An error occurred',
            variant: 'destructive',
          });
        }
        break;
    }
  }, [updateAIState, addMessage, options, toast]);

  const disconnect = useCallback(() => {
    console.log('Disconnecting...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current = null;
    }

    setIsConnected(false);
    updateAIState('idle');
    setCurrentTranscript('');
  }, [updateAIState]);

  const sendTextMessage = useCallback((text: string) => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') {
      console.error('Data channel not ready');
      return;
    }

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      }
    };

    dcRef.current.send(JSON.stringify(event));
    dcRef.current.send(JSON.stringify({ type: 'response.create' }));
    addMessage(text, 'user');
  }, [addMessage]);

  // Cleanup on unmount only - empty dependency array to prevent immediate disconnect
  useEffect(() => {
    return () => {
      // Access refs directly to avoid stale closure issues
      streamRef.current?.getTracks().forEach(track => track.stop());
      dcRef.current?.close();
      pcRef.current?.close();
      if (audioElRef.current) {
        audioElRef.current.srcObject = null;
      }
    };
  }, []);

  return {
    messages,
    isConnected,
    aiState,
    currentTranscript,
    connect,
    disconnect,
    sendTextMessage,
  };
}
