import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useGetChatSession, useSendMessage } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Bot, User, ArrowLeft, BookOpen, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatDetail() {
  const { sessionId } = useParams();
  const { data: session, isLoading } = useGetChatSession(sessionId!);
  const sendMsg = useSendMessage();
  const queryClient = useQueryClient();
  
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedSource, setSelectedSource] = useState<any>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sendMsg.isPending) return;
    
    const msg = input.trim();
    setInput("");
    
    sendMsg.mutate({ sessionId: sessionId!, data: { content: msg } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions", sessionId] });
      }
    });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!session) return <div className="text-center py-20">Session not found</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/chat">
          <Button variant="ghost" size="icon" className="hover:bg-white/5"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{session.title}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <BookOpen className="w-3 h-3" /> {session.documentName}
          </p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Chat Area */}
        <Card className="flex-1 flex flex-col glass-panel overflow-hidden border-primary/20">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-6 pb-4">
              {session.messages.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  Ask me anything about {session.documentName}. I'll use the document to provide accurate answers with citations.
                </div>
              )}
              
              {session.messages.map((m, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={m.id || i} 
                  className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : ''}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 border border-primary/30 shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${m.role === 'user' ? 'order-1' : 'order-2'}`}>
                    <div className={`p-4 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                      m.role === 'user' 
                        ? 'bg-accent text-accent-foreground rounded-tr-sm shadow-md' 
                        : 'bg-black/40 border border-white/5 rounded-tl-sm text-foreground'
                    }`}>
                      {m.content}
                    </div>
                    
                    {/* Citations/Sources */}
                    {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.sources.map((s, idx) => (
                          <button 
                            key={idx}
                            onClick={() => setSelectedSource(s)}
                            className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20 hover:bg-primary/20 transition-colors"
                          >
                            Source {idx + 1}
                            {s.pageNumber ? ` (Pg ${s.pageNumber})` : ''}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {m.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center shrink-0 order-2 border border-accent/30">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </motion.div>
              ))}

              {sendMsg.isPending && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 rounded-tl-sm flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing document...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-4 bg-black/30 border-t border-border/50">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                placeholder="Ask a question..." 
                className="bg-black/50 border-primary/30 h-12 rounded-xl px-4 text-base focus-visible:ring-primary/50"
                disabled={sendMsg.isPending}
              />
              <Button type="submit" size="icon" className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 glow-effect shrink-0" disabled={!input.trim() || sendMsg.isPending}>
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </Card>

        {/* Source Reference Panel */}
        <AnimatePresence>
          {selectedSource && (
            <motion.div 
              initial={{ opacity: 0, width: 0, x: 20 }}
              animate={{ opacity: 1, width: "300px", x: 0 }}
              exit={{ opacity: 0, width: 0, x: 20 }}
              className="hidden lg:block shrink-0"
            >
              <Card className="h-full glass-panel border-primary/30 flex flex-col">
                <div className="p-3 border-b border-border/50 flex justify-between items-center bg-black/20">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <BookOpen className="w-4 h-4" /> Source Reference
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedSource(null)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    <div className="flex gap-2 text-xs">
                      {selectedSource.pageNumber && <Badge variant="outline">Page {selectedSource.pageNumber}</Badge>}
                      <Badge variant="cyan" className="bg-cyan-500/20 text-cyan-400 border-0">
                        {Math.round(selectedSource.relevanceScore * 100)}% Match
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed p-3 bg-black/30 rounded-lg border border-white/5">
                      "{selectedSource.content}"
                    </div>
                  </div>
                </ScrollArea>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}