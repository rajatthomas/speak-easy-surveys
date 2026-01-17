import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch messages for the session
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Failed to fetch messages:', messagesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch messages' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || messages.length === 0) {
      // No messages found - update session with a default summary and return success
      console.log('No messages found for session, creating default summary:', sessionId);
      
      const defaultSummary = "Session completed. No conversation transcript was recorded.";
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          summary: defaultSummary,
          main_goals: [],
          topics_discussed: [],
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Failed to update session with default summary:', updateError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          summary: defaultSummary,
          main_goals: [],
          topics_discussed: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format conversation for AI analysis
    const conversationText = messages
      .map((m: any) => `${m.sender === 'user' ? 'User' : 'AI'}: ${m.content}`)
      .join('\n\n');

    // Call Lovable AI to generate summary
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert conversation analyst. Analyze the following conversation and extract key insights. Be concise and action-oriented.`;

    const userPrompt = `Analyze this conversation and provide a structured analysis:

${conversationText}

Provide your analysis in the following format (respond with ONLY valid JSON, no markdown):
{
  "summary": "A 2-3 sentence summary of what was discussed",
  "main_goals": ["goal1", "goal2", "goal3"],
  "topics_discussed": ["topic1", "topic2", "topic3"]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices?.[0]?.message?.content;

    if (!analysisText) {
      console.error('No analysis content in AI response');
      return new Response(
        JSON.stringify({ error: "AI analysis produced no content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response from AI
    let analysis;
    try {
      // Clean the response in case it has markdown code blocks
      const cleanedText = analysisText.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', analysisText);
      // Fallback to basic analysis
      analysis = {
        summary: "Conversation completed. Unable to generate detailed summary.",
        main_goals: [],
        topics_discussed: [],
      };
    }

    // Update the session with the analysis
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        summary: analysis.summary,
        main_goals: analysis.main_goals,
        topics_discussed: analysis.topics_discussed,
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Failed to update session:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Session summary generated successfully:', sessionId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary: analysis.summary,
        main_goals: analysis.main_goals,
        topics_discussed: analysis.topics_discussed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Generate summary error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
