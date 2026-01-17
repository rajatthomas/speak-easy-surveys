import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Check, Loader2, Users, MessageSquare, Star, Eye, Edit2, Plus, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SystemPrompt {
  id: string;
  name: string;
  prompt_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Analytics {
  totalUsers: number;
  totalSessions: number;
  avgRating: number;
  ratedSessions: number;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [promptText, setPromptText] = useState('');
  const [isActive, setIsActive] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<Analytics>({
    totalUsers: 0,
    totalSessions: 0,
    avgRating: 0,
    ratedSessions: 0,
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    fetchPrompts();
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('user_id, rating');

      if (sessionsError) throw sessionsError;

      const uniqueUsers = new Set(sessionsData?.map(s => s.user_id) || []);
      const totalSessions = sessionsData?.length || 0;
      const ratedSessions = sessionsData?.filter(s => s.rating !== null) || [];
      const avgRating = ratedSessions.length > 0
        ? ratedSessions.reduce((sum, s) => sum + (s.rating || 0), 0) / ratedSessions.length
        : 0;

      setAnalytics({
        totalUsers: uniqueUsers.size,
        totalSessions,
        avgRating: Math.round(avgRating * 10) / 10,
        ratedSessions: ratedSessions.length,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics',
        variant: 'destructive',
      });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('system_prompts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load system prompts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (prompt: SystemPrompt) => {
    setEditingId(prompt.id);
    setName(prompt.name);
    setPromptText(prompt.prompt_text);
    setIsActive(prompt.is_active);
  };

  const handleNew = () => {
    setEditingId(null);
    setName('');
    setPromptText('');
    setIsActive(false);
  };

  const handleSave = async () => {
    if (!name.trim() || !promptText.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and prompt text are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // If setting this prompt as active, deactivate others first
      if (isActive) {
        await supabase
          .from('system_prompts')
          .update({ is_active: false })
          .neq('id', editingId || '');
      }

      if (editingId) {
        // Update existing prompt
        const { error } = await supabase
          .from('system_prompts')
          .update({
            name,
            prompt_text: promptText,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: 'Success', description: 'Prompt updated successfully' });
      } else {
        // Create new prompt
        const { error } = await supabase
          .from('system_prompts')
          .insert({
            name,
            prompt_text: promptText,
            is_active: isActive,
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Prompt created successfully' });
      }

      await fetchPrompts();
      handleNew(); // Clear form
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to save prompt',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('system_prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'Success', description: 'Prompt deleted successfully' });
      await fetchPrompts();
      
      if (editingId === id) {
        handleNew();
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete prompt',
        variant: 'destructive',
      });
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      // Deactivate all prompts first
      await supabase
        .from('system_prompts')
        .update({ is_active: false })
        .neq('id', '');

      // Activate the selected prompt
      const { error } = await supabase
        .from('system_prompts')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Active prompt updated' });
      await fetchPrompts();
    } catch (error) {
      console.error('Error setting active prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to set active prompt',
        variant: 'destructive',
      });
    }
  };

  const activePrompt = prompts.find(p => p.is_active);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Manage system prompts and view analytics</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Analytics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  {analyticsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold text-foreground">{analytics.totalUsers}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-secondary/50">
                  <MessageSquare className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  {analyticsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold text-foreground">{analytics.totalSessions}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-accent/50">
                  <Star className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  {analyticsLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div>
                      <p className="text-3xl font-bold text-foreground">
                        {analytics.avgRating > 0 ? analytics.avgRating.toFixed(1) : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {analytics.ratedSessions} rated session{analytics.ratedSessions !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Active Prompt */}
        {activePrompt && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Current Active Prompt</CardTitle>
                  <Badge className="bg-green-600 text-white">Active</Badge>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleEdit(activePrompt)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-xs">Name</Label>
                <p className="font-medium text-foreground">{activePrompt.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Prompt Text</Label>
                <ScrollArea className="h-32 w-full rounded-md border border-border bg-muted/30 p-3 mt-1">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{activePrompt.prompt_text}</p>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prompt Editor and List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Edit2 className="h-5 w-5" />
                    {editingId ? 'Edit Prompt' : 'New Prompt'}
                  </CardTitle>
                  <CardDescription>
                    {editingId ? 'Update the selected system prompt' : 'Create a new system prompt for AI conversations'}
                  </CardDescription>
                </div>
                {editingId && (
                  <Button variant="ghost" size="sm" onClick={handleNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    New
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Prompt Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Executive Coach v2"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prompt">Prompt Text</Label>
                  <span className="text-xs text-muted-foreground">
                    {promptText.length} characters
                  </span>
                </div>
                <Textarea
                  id="prompt"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Enter the system prompt that will guide the AI's behavior..."
                  className="min-h-[200px] font-mono text-sm bg-background"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="active">Set as Active</Label>
                  <p className="text-xs text-muted-foreground">
                    This prompt will be used for all new conversations
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {editingId ? 'Update Prompt' : 'Create Prompt'}
              </Button>
            </CardContent>
          </Card>

          {/* Prompt History Card */}
          <Card>
            <CardHeader>
              <CardTitle>Saved Prompts</CardTitle>
              <CardDescription>Click a prompt to edit it</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : prompts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No prompts saved yet
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {prompts.map((prompt) => (
                      <div
                        key={prompt.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          editingId === prompt.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                        onClick={() => handleEdit(prompt)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-foreground truncate">
                                {prompt.name}
                              </h4>
                              {prompt.is_active && (
                                <Badge className="bg-green-600 text-white text-xs">Active</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Updated {format(new Date(prompt.updated_at), 'MMM d, yyyy HH:mm')}
                            </p>
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {prompt.prompt_text}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(prompt);
                            }}
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          {!prompt.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetActive(prompt.id);
                              }}
                            >
                              <Power className="h-3 w-3 mr-1" />
                              Activate
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{prompt.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(prompt.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
