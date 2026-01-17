import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('system_prompts')
        .select('*')
        .order('created_at', { ascending: false });

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
        .update({ is_active: true })
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
            <p className="text-sm text-muted-foreground">Manage system prompts for AI conversations</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor Card */}
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Prompt' : 'New Prompt'}</CardTitle>
              <CardDescription>
                {editingId ? 'Update the selected system prompt' : 'Create a new system prompt for AI conversations'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Prompt Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Employee Feedback Survey"
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
                  className="min-h-[300px] font-mono text-sm"
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

              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {editingId ? 'Update Prompt' : 'Create Prompt'}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={handleNew}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prompt History Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Saved Prompts</CardTitle>
                <CardDescription>Click a prompt to edit it</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleNew}>
                + New
              </Button>
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
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                <Check className="w-3 h-3" />
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Updated {format(new Date(prompt.updated_at), 'MMM d, yyyy HH:mm')}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {prompt.prompt_text}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!prompt.is_active && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetActive(prompt.id);
                              }}
                              title="Set as active"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="w-4 h-4" />
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
