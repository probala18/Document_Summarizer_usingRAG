import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useGetQuiz, useSubmitQuiz } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, XCircle, Trophy } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

export default function QuizDetail() {
  const { quizId } = useParams();
  const { data: quiz, isLoading } = useGetQuiz(quizId!);
  const submitMut = useSubmitQuiz();
  const queryClient = useQueryClient();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const isCompleted = quiz?.score !== null && quiz?.score !== undefined;
  
  // Calculate synthetic results if completed
  const results = useMemo(() => {
    if (!isCompleted || !quiz) return null;
    return {
      score: quiz.score!,
      maxScore: quiz.maxScore!,
      percentage: Math.round((quiz.score! / quiz.maxScore!) * 100)
    };
  }, [quiz, isCompleted]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;
  if (!quiz) return <div className="text-center py-20">Quiz not found</div>;

  const currentQ = quiz.questions[currentIndex];
  const progress = ((currentIndex + 1) / quiz.questions.length) * 100;
  const isLast = currentIndex === quiz.questions.length - 1;

  const handleAnswer = (val: string) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
  };

  const handleNext = () => {
    if (!answers[currentQ.id]) {
      toast.warning("Please answer the question first");
      return;
    }
    if (!isLast) setCurrentIndex(prev => prev + 1);
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < quiz.questions.length) {
      toast.error("Please answer all questions");
      return;
    }
    submitMut.mutate({ quizId: quizId!, data: { answers } }, {
      onSuccess: () => {
        toast.success("Quiz submitted successfully!");
        queryClient.invalidateQueries({ queryKey: ["/api/quizzes", quizId] });
      },
      onError: () => toast.error("Failed to submit quiz")
    });
  };

  if (isCompleted && results) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/quiz">
            <Button variant="ghost" size="icon" className="hover:bg-white/5"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Assessment Results</h1>
        </div>

        <Card className="glass-panel border-primary/30 overflow-hidden text-center p-10 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
          <Trophy className={`w-20 h-20 mx-auto mb-6 ${results.percentage >= 70 ? 'text-yellow-400' : 'text-muted-foreground'}`} />
          <h2 className="text-4xl font-bold mb-2">{results.percentage}% Score</h2>
          <p className="text-muted-foreground text-lg mb-6">{results.score} out of {results.maxScore} correct</p>
          <Badge variant={results.percentage >= 70 ? 'cyan' : 'secondary'} className="text-lg px-4 py-1">
            {results.percentage >= 90 ? 'Excellent Mastery' : 
             results.percentage >= 70 ? 'Proficient' : 
             'Needs Review'}
          </Badge>
        </Card>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Review Questions</h3>
          {quiz.questions.map((q, i) => {
            // Note: The real API returns feedback array, but since we don't store user's past answers in the Quiz model directly,
            // we are looking at the correct answer. The user has to just view the correct answers.
            // A real app would get QuizResult back. If we don't have it, we just show the correct answers.
            return (
              <Card key={q.id} className="glass-panel bg-black/20">
                <CardHeader className="py-4 bg-white/5">
                  <CardTitle className="text-base flex gap-3 leading-relaxed">
                    <span className="text-muted-foreground font-mono">{i+1}.</span> 
                    {q.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start gap-2 p-3 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-sm uppercase tracking-wider block mb-1">Correct Answer</span>
                      {q.answer}
                    </div>
                  </div>
                  {q.explanation && (
                    <div className="text-sm text-muted-foreground p-3 bg-black/40 rounded-lg border border-white/5">
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto min-h-[calc(100vh-10rem)] flex flex-col justify-center">
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Question {currentIndex + 1} of {quiz.questions.length}</span>
          <span>{Math.round(progress)}% completed</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="glass-panel border-accent/30 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
            <CardHeader className="pb-4">
              <Badge variant="outline" className="w-fit mb-4">{currentQ.questionType.replace('_', ' ')}</Badge>
              <CardTitle className="text-2xl leading-relaxed">{currentQ.question}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mt-6">
                {currentQ.questionType === 'multiple_choice' && currentQ.options && (
                  <RadioGroup value={answers[currentQ.id] || ""} onValueChange={handleAnswer} className="space-y-3">
                    {currentQ.options.map(opt => (
                      <Label
                        key={opt.label}
                        className={`flex items-center space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer transition-colors ${
                          answers[currentQ.id] === opt.label 
                            ? 'border-accent bg-accent/10 text-accent-foreground shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]' 
                            : 'border-border/50 hover:bg-white/5 text-foreground'
                        }`}
                      >
                        <RadioGroupItem value={opt.label} />
                        <div className="flex gap-3 text-base font-normal">
                          <span className="font-semibold text-accent">{opt.label}.</span>
                          {opt.text}
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                )}

                {currentQ.questionType === 'true_false' && (
                  <div className="grid grid-cols-2 gap-4">
                    {['True', 'False'].map(opt => (
                      <Button
                        key={opt}
                        variant="outline"
                        className={`h-16 text-lg transition-all ${
                          answers[currentQ.id] === opt 
                            ? 'border-accent bg-accent text-accent-foreground glow-effect' 
                            : 'border-border/50 hover:bg-white/5'
                        }`}
                        onClick={() => handleAnswer(opt)}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                )}

                {currentQ.questionType === 'short_answer' && (
                  <Input 
                    placeholder="Type your answer..." 
                    className="h-14 text-lg bg-black/30 border-accent/30 focus-visible:ring-accent"
                    value={answers[currentQ.id] || ""}
                    onChange={e => handleAnswer(e.target.value)}
                  />
                )}
              </div>

              <div className="flex justify-between mt-10 pt-6 border-t border-border/50">
                <Button variant="ghost" onClick={() => setCurrentIndex(p => Math.max(0, p - 1))} disabled={currentIndex === 0}>
                  Previous
                </Button>
                {isLast ? (
                  <Button onClick={handleSubmit} disabled={submitMut.isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 glow-effect">
                    {submitMut.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                    Submit Assessment
                  </Button>
                ) : (
                  <Button onClick={handleNext} className="bg-primary hover:bg-primary/90 px-8 glow-effect">
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}