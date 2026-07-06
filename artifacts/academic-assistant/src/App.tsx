import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

import Login from '@/pages/login';
import Register from '@/pages/register';
import Dashboard from '@/pages/dashboard';
import Documents from '@/pages/documents';
import DocumentDetail from '@/pages/document-detail';
import ChatSessions from '@/pages/chat-sessions';
import ChatDetail from '@/pages/chat-detail';
import Quizzes from '@/pages/quizzes';
import QuizDetail from '@/pages/quiz-detail';
import Flashcards from '@/pages/flashcards';
import FlashcardDetail from '@/pages/flashcard-detail';
import NotFound from '@/pages/not-found';
import { Layout } from '@/components/layout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({ component: Component, params }: any) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-primary">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <Redirect to="/login" />;
  }

  return <Component params={params} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      <Route path="/" component={() => <Redirect to="/dashboard" />} />

      <Route path="/dashboard">
        {() => <Layout><ProtectedRoute component={Dashboard} /></Layout>}
      </Route>

      <Route path="/documents">
        {() => <Layout><ProtectedRoute component={Documents} /></Layout>}
      </Route>

      <Route path="/documents/:id">
        {() => <Layout><ProtectedRoute component={DocumentDetail} /></Layout>}
      </Route>

      <Route path="/chat">
        {() => <Layout><ProtectedRoute component={ChatSessions} /></Layout>}
      </Route>

      <Route path="/chat/:sessionId">
        {() => <Layout><ProtectedRoute component={ChatDetail} /></Layout>}
      </Route>

      <Route path="/quiz">
        {() => <Layout><ProtectedRoute component={Quizzes} /></Layout>}
      </Route>

      <Route path="/quiz/:quizId">
        {() => <Layout><ProtectedRoute component={QuizDetail} /></Layout>}
      </Route>

      <Route path="/flashcards">
        {() => <Layout><ProtectedRoute component={Flashcards} /></Layout>}
      </Route>

      <Route path="/flashcards/:setId">
        {() => <Layout><ProtectedRoute component={FlashcardDetail} /></Layout>}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster theme="dark" toastOptions={{ className: 'glass-panel text-foreground border-border shadow-xl' }} />
      </AuthProvider>
    </QueryClientProvider>
  );
}