import { useLocation } from "wouter";

export default function NotFound() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center glass-panel p-12 rounded-2xl max-w-md glow-effect">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The academic sector you are looking for ({location}) does not exist in our archives.
        </p>
        <button 
          onClick={() => window.history.back()}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          Return to Previous Sector
        </button>
      </div>
    </div>
  );
}