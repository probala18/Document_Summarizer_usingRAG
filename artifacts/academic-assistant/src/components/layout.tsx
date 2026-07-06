import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { BookOpen, FileText, MessageSquare, GraduationCap, LayoutDashboard, LogOut, Hexagon } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/chat", label: "Chats", icon: MessageSquare },
    { href: "/quiz", label: "Quizzes", icon: Hexagon },
    { href: "/flashcards", label: "Flashcards", icon: GraduationCap },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border glass-panel rounded-none flex flex-col z-10">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2 text-primary glow-effect rounded-full p-1">
            <BookOpen className="w-6 h-6" />
            <span className="font-bold text-lg tracking-tight text-foreground">Aura<span className="text-primary">Learn</span></span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {links.map((link) => {
            const isActive = location.startsWith(link.href) && (link.href !== "/dashboard" || location === "/dashboard");
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                  isActive 
                    ? "bg-primary/20 text-primary glow-effect shadow-[0_0_15px_rgba(139,92,246,0.3)]" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <link.icon className="w-5 h-5" />
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <button 
            onClick={() => logout()}
            className="flex items-center gap-3 w-full px-3 py-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        
        <div className="flex-1 overflow-auto p-6 md:p-8 relative z-0">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}