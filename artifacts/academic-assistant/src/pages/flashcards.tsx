import { useListFlashcardSets } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, FileText, Layers, Play } from "lucide-react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export default function Flashcards() {
  const { data: sets, isLoading } = useListFlashcardSets();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Flashcard Decks</h1>
        <p className="text-muted-foreground mt-1">Active recall sets generated from your archives.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-pink-500" /></div>
      ) : sets && sets.length > 0 ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sets.map(deck => (
            <Card key={deck.id} className="glass-panel overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg border-pink-500/20 hover:border-pink-500/50 group">
              <div className="h-2 w-full bg-gradient-to-r from-pink-500 to-purple-500 opacity-80" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-pink-500/10 text-pink-400 rounded-xl">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div className="bg-black/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border border-white/5">
                    <Layers className="w-3 h-3" /> {deck.cards.length} Cards
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                    {deck.topic || `Deck from ${deck.documentName}`}
                  </h3>
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate">{deck.documentName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created {format(new Date(deck.createdAt), 'MMM d, yyyy')}
                  </div>
                </div>

                <Link href={`/flashcards/${deck.id}`}>
                  <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all">
                    <Play className="w-4 h-4 mr-2" /> Study Deck
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-20 bg-black/10 rounded-2xl border border-dashed border-border">
          <GraduationCap className="w-16 h-16 mx-auto text-pink-500/30 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No flashcard decks</h3>
          <p className="text-muted-foreground mb-6">Generate flashcards from your documents for rapid memorization.</p>
          <Link href="/documents">
            <Button className="bg-pink-600 hover:bg-pink-700 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)]">Browse Documents</Button>
          </Link>
        </div>
      )}
    </div>
  );
}