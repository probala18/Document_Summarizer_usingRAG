import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { 
  useGetDocument, 
  useSummarizeDocument, 
  useGetDocumentSummaries,
  useExtractConcepts,
  useGetDocumentConcepts,
  useCreateChatSession,
  useGenerateQuiz,
  useGenerateFlashcards
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, BrainCircuit, Lightbulb, MessageSquare, Hexagon, GraduationCap, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function DocumentDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  const { data: doc, isLoading } = useGetDocument(id!);
  
  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!doc) {
    return <div className="text-center py-20">Document not found</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="mb-2 -ml-4 hover:bg-white/5" onClick={() => setLocation('/documents')}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Documents
      </Button>

      <div className="flex items-start justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/20 text-primary rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{doc.name}</h1>
          </div>
          <div className="flex gap-3 text-sm text-muted-foreground mt-3">
            <Badge variant="outline">{doc.status}</Badge>
            <span>{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
            <span>Uploaded {format(new Date(doc.createdAt), 'PP')}</span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="glass-panel border border-border bg-black/20 p-1 mb-6 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="flex-1 min-w-[120px]"><FileText className="w-4 h-4 mr-2"/> Overview</TabsTrigger>
          <TabsTrigger value="summaries" className="flex-1 min-w-[120px]"><BrainCircuit className="w-4 h-4 mr-2"/> Summaries</TabsTrigger>
          <TabsTrigger value="concepts" className="flex-1 min-w-[120px]"><Lightbulb className="w-4 h-4 mr-2"/> Concepts</TabsTrigger>
          <TabsTrigger value="chat" className="flex-1 min-w-[120px]"><MessageSquare className="w-4 h-4 mr-2"/> Chat</TabsTrigger>
          <TabsTrigger value="quiz" className="flex-1 min-w-[120px]"><Hexagon className="w-4 h-4 mr-2"/> Quiz</TabsTrigger>
          <TabsTrigger value="flashcards" className="flex-1 min-w-[120px]"><GraduationCap className="w-4 h-4 mr-2"/> Flashcards</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Document Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <p className="font-medium capitalize">{doc.status}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Size</p>
                  <p className="font-medium">{(doc.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Pages</p>
                  <p className="font-medium">{doc.pageCount || 'Unknown'}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Words</p>
                  <p className="font-medium">{doc.wordCount || 'Unknown'}</p>
                </div>
              </div>
              {doc.summary && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Base Summary</h3>
                  <div className="p-4 bg-white/5 rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
                    {doc.summary}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summaries">
          <SummariesTab docId={id!} />
        </TabsContent>

        <TabsContent value="concepts">
          <ConceptsTab docId={id!} />
        </TabsContent>

        <TabsContent value="chat">
          <ChatLauncherTab docId={id!} docName={doc.name} />
        </TabsContent>

        <TabsContent value="quiz">
          <QuizLauncherTab docId={id!} />
        </TabsContent>

        <TabsContent value="flashcards">
          <FlashcardsLauncherTab docId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sub-components for tabs

function SummariesTab({ docId }: { docId: string }) {
  const { data: summaries, refetch } = useGetDocumentSummaries(docId);
  const summarizeMut = useSummarizeDocument();
  const [type, setType] = useState<"short"|"detailed"|"bullet"|"executive">("bullet");

  const handleGenerate = () => {
    summarizeMut.mutate({ documentId: docId, data: { summaryType: type } }, {
      onSuccess: () => {
        toast.success("Summary generated");
        refetch();
      },
      onError: (err: any) => toast.error("Failed to generate summary: " + (err?.data?.error || err?.message || "Unknown error"))
    });
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="glass-panel md:col-span-1 h-fit">
        <CardHeader>
          <CardTitle>Generate Summary</CardTitle>
          <CardDescription>Select a format for your summary</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="short">Short</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
              <SelectItem value="bullet">Bullet Points</SelectItem>
              <SelectItem value="executive">Executive</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} className="w-full" disabled={summarizeMut.isPending}>
            {summarizeMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BrainCircuit className="w-4 h-4 mr-2" />}
            Generate
          </Button>
        </CardContent>
      </Card>
      
      <div className="md:col-span-2 space-y-4">
        {summaries?.map(s => (
          <Card key={s.id} className="glass-panel">
            <CardHeader className="py-4">
              <div className="flex justify-between items-center">
                <Badge variant="cyan" className="capitalize">{s.summaryType}</Badge>
                <span className="text-xs text-muted-foreground">{format(new Date(s.createdAt), "PPp")}</span>
              </div>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap leading-relaxed">
              {s.content}
            </CardContent>
          </Card>
        ))}
        {summaries?.length === 0 && (
          <div className="text-center p-12 bg-black/10 rounded-xl border border-dashed border-border text-muted-foreground">
            No summaries generated yet. Create one from the panel.
          </div>
        )}
      </div>
    </div>
  );
}

function ConceptsTab({ docId }: { docId: string }) {
  const { data: concepts, refetch, isLoading } = useGetDocumentConcepts(docId);
  const extractMut = useExtractConcepts();

  const handleExtract = () => {
    extractMut.mutate({ documentId: docId }, {
      onSuccess: () => {
        toast.success("Concepts extracted");
        refetch();
      },
      onError: () => toast.error("Extraction failed")
    });
  };

  const byType = concepts?.reduce((acc, c) => {
    if (!acc[c.conceptType]) acc[c.conceptType] = [];
    acc[c.conceptType].push(c);
    return acc;
  }, {} as Record<string, typeof concepts>) || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Automatically identified key terms, entities, and definitions.</p>
        <Button onClick={handleExtract} disabled={extractMut.isPending} variant="outline" className="border-accent text-accent hover:bg-accent/10">
          {extractMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lightbulb className="w-4 h-4 mr-2" />}
          {concepts?.length ? "Regenerate Concepts" : "Extract Concepts"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : concepts?.length ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(byType).map(([type, items]) => (
            <Card key={type} className="glass-panel">
              <CardHeader className="py-3 px-4 border-b border-border/50 bg-black/20">
                <CardTitle className="text-sm font-bold capitalize text-accent flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] bg-background/50">{items.length}</Badge>
                  {type}s
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/30 max-h-96 overflow-auto">
                  {items.map(c => (
                    <div key={c.id} className="p-4 hover:bg-white/5">
                      <div className="font-medium text-primary-foreground mb-1">{c.term}</div>
                      <div className="text-sm text-muted-foreground leading-relaxed">{c.definition}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-12 bg-black/10 rounded-xl border border-dashed border-border text-muted-foreground">
          No concepts extracted yet. Click the button above to analyze the document.
        </div>
      )}
    </div>
  );
}

function ChatLauncherTab({ docId, docName }: { docId: string, docName: string }) {
  const [, setLocation] = useLocation();
  const createChat = useCreateChatSession();
  const [title, setTitle] = useState(`Chat about ${docName}`);

  const handleStart = () => {
    createChat.mutate({ data: { documentId: docId, title } }, {
      onSuccess: (res) => {
        setLocation(`/chat/${res.id}`);
      },
      onError: () => toast.error("Failed to start chat")
    });
  };

  return (
    <Card className="max-w-md mx-auto mt-8 glass-panel border-primary/30 shadow-[0_0_30px_rgba(139,92,246,0.1)]">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
          <MessageSquare className="w-8 h-8" />
        </div>
        <CardTitle className="text-2xl">Start Interactive Session</CardTitle>
        <CardDescription>Chat directly with this document using RAG</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Session Title</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-black/30" />
        </div>
        <Button onClick={handleStart} className="w-full text-lg h-12 glow-effect" disabled={createChat.isPending}>
          {createChat.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : "Initialize Chat"}
        </Button>
      </CardContent>
    </Card>
  );
}

function QuizLauncherTab({ docId }: { docId: string }) {
  const [, setLocation] = useLocation();
  const genQuiz = useGenerateQuiz();
  const [diff, setDiff] = useState<"easy"|"medium"|"hard">("medium");
  const [count, setCount] = useState("5");

  const handleGen = () => {
    genQuiz.mutate({ documentId: docId, data: { difficulty: diff, questionCount: parseInt(count, 10), questionTypes: ["multiple_choice", "true_false"] } }, {
      onSuccess: (res) => setLocation(`/quiz/${res.id}`),
      onError: () => toast.error("Failed to generate quiz")
    });
  };

  return (
    <Card className="max-w-md mx-auto mt-8 glass-panel border-accent/30 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4 text-accent">
          <Hexagon className="w-8 h-8" />
        </div>
        <CardTitle className="text-2xl">Generate Assessment</CardTitle>
        <CardDescription>Test your knowledge on this material</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Difficulty</label>
          <Select value={diff} onValueChange={(v: any) => setDiff(v)}>
            <SelectTrigger className="bg-black/30"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Beginner</SelectItem>
              <SelectItem value="medium">Intermediate</SelectItem>
              <SelectItem value="hard">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Question Count ({count})</label>
          <Input type="range" min="1" max="20" value={count} onChange={e => setCount(e.target.value)} className="w-full" />
        </div>
        <Button onClick={handleGen} className="w-full text-lg h-12 bg-accent hover:bg-accent/90 text-accent-foreground glow-effect" disabled={genQuiz.isPending}>
          {genQuiz.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : "Build Quiz"}
        </Button>
      </CardContent>
    </Card>
  );
}

function FlashcardsLauncherTab({ docId }: { docId: string }) {
  const [, setLocation] = useLocation();
  const genCards = useGenerateFlashcards();
  const [count, setCount] = useState("10");

  const handleGen = () => {
    genCards.mutate({ documentId: docId, data: { cardCount: parseInt(count, 10) } }, {
      onSuccess: (res) => setLocation(`/flashcards/${res.id}`),
      onError: () => toast.error("Failed to generate flashcards")
    });
  };

  return (
    <Card className="max-w-md mx-auto mt-8 glass-panel border-pink-500/30 shadow-[0_0_30px_rgba(236,72,153,0.1)]">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-pink-400">
          <GraduationCap className="w-8 h-8" />
        </div>
        <CardTitle className="text-2xl">Create Flashcard Deck</CardTitle>
        <CardDescription>Rapid active recall practice</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Deck Size ({count} cards)</label>
          <Input type="range" min="5" max="50" step="5" value={count} onChange={e => setCount(e.target.value)} className="w-full" />
        </div>
        <Button onClick={handleGen} className="w-full text-lg h-12 bg-pink-600 hover:bg-pink-700 text-white glow-effect" disabled={genCards.isPending}>
          {genCards.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : "Generate Deck"}
        </Button>
      </CardContent>
    </Card>
  );
}