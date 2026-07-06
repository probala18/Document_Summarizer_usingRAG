import { useGetDashboardStats, useGetRecentActivity } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { FileText, MessageSquare, Hexagon, GraduationCap, UploadCloud, BrainCircuit, Activity, FileUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1 variants={item} className="text-4xl font-bold tracking-tight mb-1 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            Welcome back, {user?.name.split(' ')[0]}
          </motion.h1>
          <motion.p variants={item} className="text-muted-foreground">
            Here's an overview of your academic archives.
          </motion.p>
        </div>
        
        <motion.div variants={item} className="flex gap-3">
          <Link href="/documents">
            <Button className="bg-primary hover:bg-primary/90 glow-effect">
              <UploadCloud className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </Link>
          <Link href="/chat">
            <Button variant="outline" className="border-accent/50 text-accent hover:bg-accent/10">
              <MessageSquare className="w-4 h-4 mr-2" />
              Start Chat
            </Button>
          </Link>
        </motion.div>
      </div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Documents" 
          value={stats?.totalDocuments} 
          loading={statsLoading} 
          icon={FileText} 
          color="text-blue-400" 
          bgColor="bg-blue-400/10" 
        />
        <StatCard 
          title="Chat Sessions" 
          value={stats?.totalChats} 
          loading={statsLoading} 
          icon={MessageSquare} 
          color="text-primary" 
          bgColor="bg-primary/10" 
        />
        <StatCard 
          title="Quizzes Taken" 
          value={stats?.totalQuizzes} 
          loading={statsLoading} 
          icon={Hexagon} 
          color="text-accent" 
          bgColor="bg-accent/10" 
        />
        <StatCard 
          title="Flashcards" 
          value={stats?.totalFlashcards} 
          loading={statsLoading} 
          icon={GraduationCap} 
          color="text-pink-400" 
          bgColor="bg-pink-400/10" 
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={item} className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Activity
            </h2>
          </div>
          
          <Card className="glass-panel overflow-hidden border-t-2 border-t-primary/50">
            {activityLoading ? (
              <div className="p-6 space-y-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full bg-white/5" />)}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="divide-y divide-border/50">
                {activity.map((act) => (
                  <div key={act.id} className="p-4 hover:bg-white/5 transition-colors flex gap-4 items-start">
                    <div className={`p-2 rounded-full mt-1 ${
                      act.activityType === 'upload' ? 'bg-blue-500/20 text-blue-400' :
                      act.activityType === 'chat' ? 'bg-primary/20 text-primary' :
                      act.activityType === 'quiz' ? 'bg-accent/20 text-accent' :
                      act.activityType === 'flashcard' ? 'bg-pink-500/20 text-pink-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {act.activityType === 'upload' && <FileUp className="w-4 h-4" />}
                      {act.activityType === 'chat' && <MessageSquare className="w-4 h-4" />}
                      {act.activityType === 'quiz' && <Hexagon className="w-4 h-4" />}
                      {act.activityType === 'flashcard' && <GraduationCap className="w-4 h-4" />}
                      {act.activityType === 'summary' && <BrainCircuit className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{act.title}</p>
                      {act.description && <p className="text-xs text-muted-foreground mt-1">{act.description}</p>}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(act.createdAt), "MMM d, h:mm a")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No activity yet. Upload a document to begin.</p>
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div variants={item} className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              Recent Archives
            </h2>
            <Link href="/documents" className="text-sm text-accent hover:underline">View All</Link>
          </div>
          
          <div className="space-y-4">
            {statsLoading ? (
               [1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl bg-white/5" />)
            ) : stats?.recentDocuments && stats.recentDocuments.length > 0 ? (
              stats.recentDocuments.map(doc => (
                <Link key={doc.id} href={`/documents/${doc.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer group bg-black/20 backdrop-blur-md">
                    <CardContent className="p-4 flex gap-4 items-center">
                      <div className="p-3 bg-white/5 rounded-lg group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h3 className="font-medium truncate group-hover:text-primary transition-colors">{doc.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className={`w-2 h-2 rounded-full ${
                            doc.status === 'ready' ? 'bg-green-500' : 
                            doc.status === 'error' ? 'bg-destructive' : 'bg-yellow-500 animate-pulse'
                          }`} />
                          <span className="capitalize">{doc.status}</span>
                          <span>•</span>
                          <span>{(doc.size / 1024 / 1024).toFixed(1)} MB</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <Card className="glass-panel border-dashed p-8 text-center bg-black/10">
                <p className="text-sm text-muted-foreground">No documents uploaded.</p>
                <Link href="/documents">
                  <Button variant="link" className="text-primary mt-2">Upload one now</Button>
                </Link>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, loading, icon: Icon, color, bgColor }: any) {
  return (
    <Card className="glass-panel overflow-hidden relative group">
      <div className={`absolute top-0 right-0 w-24 h-24 ${bgColor} rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />
      <CardContent className="p-6 relative z-10">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 bg-white/10" />
            ) : (
              <p className="text-3xl font-bold">{value || 0}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${bgColor} ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}