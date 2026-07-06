import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useGetFlashcardSet } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowLeft, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FlashcardDetail() {
  const { setId } = useParams();
  const { data: deck, isLoading } = useGetFlashcardSet(setId!);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        setIsFlipped(f => !f);
      } else if (e.key === 'ArrowRight') {
        if (deck && currentIndex < deck.cards.length - 1) {
          setIsFlipped(false);
          setCurrentIndex(c => c + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          setIsFlipped(false);
          setCurrentIndex(c => c - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, deck]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-pink-500" /></div>;
  if (!deck) return <div className="text-center py-20">Deck not found</div>;

  const card = deck.cards[currentIndex];
  const progress = ((currentIndex + 1) / deck.cards.length) * 100;

  const nextCard = () => {
    setIsFlipped(false);
    if (currentIndex < deck.cards.length - 1) setCurrentIndex(c => c + 1);
  };

  const prevCard = () => {
    setIsFlipped(false);
    if (currentIndex > 0) setCurrentIndex(c => c - 1);
  };

  return (
    <div className="max-w-3xl mx-auto min-h-[calc(100vh-10rem)] flex flex-col pt-8">
      <div className="flex items-center justify-between mb-8">
        <Link href="/flashcards">
          <Button variant="ghost" className="hover:bg-white/5"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Decks</Button>
        </Link>
        <div className="text-sm font-medium text-pink-400 bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/20">
          Card {currentIndex + 1} of {deck.cards.length}
        </div>
      </div>

      <div className="mb-12">
        <Progress value={progress} className="h-1.5 bg-secondary [&>div]:bg-pink-500 [&>div]:shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Flashcard 3D Container */}
        <div className="w-full aspect-[3/2] sm:aspect-[2/1] max-w-2xl perspective-1000">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full relative preserve-3d cursor-pointer"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <motion.div
                animate={{ rotateX: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
                className="w-full h-full relative preserve-3d"
              >
                {/* Front (Question) */}
                <div 
                  className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-8 sm:p-12 text-center glass-panel rounded-3xl border-2 border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-gradient-to-b from-card to-background"
                >
                  <div className="absolute top-6 text-sm uppercase tracking-widest text-muted-foreground/50 font-bold">Question</div>
                  <h2 className="text-2xl sm:text-4xl font-semibold leading-relaxed text-foreground">{card.question}</h2>
                  <div className="absolute bottom-6 flex items-center gap-2 text-sm text-pink-500/70 animate-pulse">
                    <RefreshCw className="w-4 h-4" /> Click to flip
                  </div>
                </div>

                {/* Back (Answer) */}
                <div 
                  className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-8 sm:p-12 text-center glass-panel rounded-3xl border-2 border-pink-500/20 shadow-[0_20px_50px_rgba(236,72,153,0.15)] bg-gradient-to-b from-pink-950/20 to-background"
                  style={{ transform: "rotateX(180deg)" }}
                >
                  <div className="absolute top-6 text-sm uppercase tracking-widest text-pink-500/50 font-bold">Answer</div>
                  <div className="text-xl sm:text-3xl font-medium leading-relaxed text-pink-50">{card.answer}</div>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-6 mt-12">
          <Button 
            variant="outline" 
            size="icon" 
            className="w-14 h-14 rounded-full border-white/10 hover:bg-white/5 hover:text-white transition-all"
            onClick={prevCard}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <div className="text-sm text-muted-foreground hidden sm:block">
            Use <kbd className="bg-white/10 px-2 py-1 rounded font-mono text-xs">Space</kbd> to flip, <kbd className="bg-white/10 px-2 py-1 rounded font-mono text-xs">←</kbd> <kbd className="bg-white/10 px-2 py-1 rounded font-mono text-xs">→</kbd> to navigate
          </div>

          <Button 
            size="icon" 
            className="w-14 h-14 rounded-full bg-pink-600 hover:bg-pink-700 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)] transition-all disabled:opacity-50 disabled:shadow-none"
            onClick={nextCard}
            disabled={currentIndex === deck.cards.length - 1}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}