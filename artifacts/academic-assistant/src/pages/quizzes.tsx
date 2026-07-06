import { useListQuizzes } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hexagon, CheckCircle2, Clock, Play, FileText } from "lucide-react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export default function Quizzes() {
  const { data: quizzes, isLoading } = useListQuizzes();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
        <p className="text-muted-foreground mt-1">Evaluate your understanding of the material.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
      ) : quizzes && quizzes.length > 0 ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {quizzes.map(q => {
            const isCompleted = q.score !== null && q.score !== undefined;
            const percentage = isCompleted ? Math.round((q.score! / q.maxScore!) * 100) : null;
            
            return (
              <Card key={q.id} className={`glass-panel overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg ${isCompleted ? 'border-primary/30' : 'border-accent/30'}`}>
                <div className={`h-2 w-full ${isCompleted ? 'bg-primary' : 'bg-accent'} opacity-80`} />
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant={q.difficulty === 'easy' ? 'secondary' : q.difficulty === 'medium' ? 'cyan' : 'destructive'} className="capitalize">
                      {q.difficulty}
                    </Badge>
                    {isCompleted && (
                      <div className="flex items-center gap-1 text-green-400 text-sm font-semibold bg-green-400/10 px-2 py-1 rounded-md">
                        <CheckCircle2 className="w-4 h-4" /> {percentage}%
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex gap-2">
                      <FileText className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      <h3 className="font-semibold text-lg leading-tight line-clamp-2">{q.documentName}</h3>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Hexagon className="w-4 h-4" /> {q.questions.length} Questions</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {format(new Date(q.createdAt), 'MMM d')}</span>
                    </div>
                  </div>

                  <Link href={`/quiz/${q.id}`}>
                    <Button className={`w-full ${isCompleted ? 'bg-secondary hover:bg-secondary/80 text-foreground' : 'bg-accent hover:bg-accent/90 text-accent-foreground glow-effect'}`}>
                      {isCompleted ? "Review Results" : <><Play className="w-4 h-4 mr-2" /> Start Quiz</>}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-20 bg-black/10 rounded-2xl border border-dashed border-border">
          <Hexagon className="w-16 h-16 mx-auto text-accent/30 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No assessments generated</h3>
          <p className="text-muted-foreground mb-6">Generate quizzes from your documents to test your knowledge.</p>
          <Link href="/documents">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 glow-effect">Browse Documents</Button>
          </Link>
        </div>
      )}
    </div>
  );
}