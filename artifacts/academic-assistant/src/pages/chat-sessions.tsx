import { useListChatSessions, useDeleteChatSession } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Clock, FileText, Trash2, Loader2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ChatSessions() {
  const { data: sessions, isLoading } = useListChatSessions();
  const deleteSession = useDeleteChatSession();
  const queryClient = useQueryClient();

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Delete this chat session?")) {
      deleteSession.mutate({ sessionId: id }, {
        onSuccess: () => {
          toast.success("Session deleted");
          queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
        }
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Active Dialogues</h1>
        <p className="text-muted-foreground mt-1">Review and continue your document conversations.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : sessions && sessions.length > 0 ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sessions.map(s => (
            <Link key={s.id} href={`/chat/${s.id}`}>
              <Card className="glass-panel group hover:border-primary/50 cursor-pointer h-full transition-all">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-primary/20 text-primary rounded-xl group-hover:scale-110 transition-transform">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive" onClick={(e) => handleDelete(e, s.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2 flex-1">{s.title}</h3>
                  
                  <div className="space-y-2 mt-4 text-sm text-muted-foreground border-t border-border/50 pt-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-accent" />
                      <span className="truncate">{s.documentName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(s.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-1 font-medium text-primary">
                        {s.messageCount} msgs <ArrowRight className="w-3 h-3 ml-1" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center p-20 bg-black/10 rounded-2xl border border-dashed border-border">
          <MessageSquare className="w-16 h-16 mx-auto text-primary/30 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No active sessions</h3>
          <p className="text-muted-foreground mb-6">Start a chat from any document in your library.</p>
          <Link href="/documents">
            <Button className="glow-effect">Browse Documents</Button>
          </Link>
        </div>
      )}
    </div>
  );
}