import { Link, useLocation } from 'react-router-dom';
import { 
  Truck, 
  Route, 
  DollarSign, 
  FileText, 
  Users, 
  LayoutDashboard,
  Menu,
  X,
  Activity,
  Building2,
  MapPin,
  Loader2,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, color: 'from-blue-500 to-cyan-500' },
  { name: 'Camions', href: '/camions', icon: Truck, color: 'from-purple-500 to-pink-500' },
  { name: 'Trajets', href: '/trajets', icon: Route, color: 'from-green-500 to-emerald-500' },
  { name: 'Dépenses', href: '/depenses', icon: DollarSign, color: 'from-orange-500 to-red-500' },
  { name: 'Factures', href: '/factures', icon: FileText, color: 'from-indigo-500 to-blue-500' },
  { name: 'Chauffeurs', href: '/chauffeurs', icon: Users, color: 'from-cyan-500 to-teal-500' },
  { name: 'Tiers', href: '/tiers', icon: Building2, color: 'from-violet-500 to-purple-500' },
  { name: 'Suivi GPS', href: '/suivi', icon: MapPin, color: 'from-blue-500 to-indigo-500' },
];

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading, apiError } = useApp();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background relative">
      {apiError && (
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {apiError} — Vérifiez que le backend est démarré (npm run start:dev dans backend/)
          </AlertDescription>
        </Alert>
      )}
      {isLoading && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des données...
        </div>
      )}
      {/* Pattern de fond style Rocket AI - grille subtile */}
      <div 
        className="fixed inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none z-0 bg-[linear-gradient(to_right,#6366f1_1px,transparent_1px),linear-gradient(to_bottom,#6366f1_1px,transparent_1px)] bg-[size:24px_24px]"
      />

      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden transition-all duration-300",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-80 bg-gradient-to-b from-sidebar to-sidebar/95 border-r border-sidebar-border shadow-2xl">
          {/* Header */}
          <div className="flex h-20 items-center justify-between px-6 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 rounded-xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="relative bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600 p-2.5 rounded-xl shadow-lg">
                  <Activity className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">Truck Track</span>
                <p className="text-xs text-muted-foreground">Cameroun</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="text-sidebar-foreground hover:bg-sidebar-accent p-2 rounded-lg transition-colors" 
              title="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 relative",
                    isActive 
                      ? "bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 text-violet-300 font-semibold shadow-md shadow-violet-500/20" 
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-r-full" />
                  )}
                  <div className={cn(
                    "p-2 rounded-lg transition-all duration-200",
                    isActive 
                      ? `bg-gradient-to-br ${item.color} shadow-lg` 
                      : "bg-sidebar-accent/30 group-hover:bg-sidebar-accent/50"
                  )}>
                    <Icon className={cn(
                      "h-5 w-5 transition-all duration-200",
                      isActive ? "text-white" : "text-sidebar-foreground"
                    )} />
                  </div>
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-80 lg:flex-col lg:z-30">
        <div className="flex grow flex-col bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95 border-r border-sidebar-border shadow-2xl">
          {/* Header with enhanced design */}
          <div className="flex h-24 items-center gap-4 px-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-sidebar-border/50">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 rounded-2xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
              <div className="relative bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600 p-3 rounded-2xl shadow-xl">
                <Truck className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
                Truck Track
              </h1>
              <p className="text-xs text-muted-foreground font-medium">Gestion de Flotte</p>
            </div>
          </div>

          {/* Navigation with enhanced design */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 relative",
                    isActive 
                      ? "bg-gradient-to-r from-violet-500/20 via-fuchsia-500/15 to-indigo-500/10 text-violet-300 font-semibold shadow-lg shadow-violet-500/10 transform scale-[1.02]" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground hover:scale-[1.02]"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-gradient-to-b from-violet-500 via-fuchsia-500 to-indigo-500 rounded-r-full shadow-lg shadow-violet-500/50" />
                  )}
                  <div className={cn(
                    "p-2.5 rounded-xl transition-all duration-300 relative",
                    isActive 
                      ? `bg-gradient-to-br ${item.color} shadow-lg shadow-violet-500/30` 
                      : "bg-sidebar-accent/30 group-hover:bg-sidebar-accent/50"
                  )}>
                    <Icon className={cn(
                      "h-5 w-5 transition-all duration-300",
                      isActive ? "text-white" : "text-sidebar-foreground"
                    )} />
                  </div>
                  <span className="text-sm font-medium tracking-wide">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse shadow-lg shadow-violet-500/50" />
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-sidebar-border/50 bg-gradient-to-t from-sidebar/50 to-transparent">
            <div className="text-center text-xs text-muted-foreground">
              <p className="font-medium">Truck Track Cameroun</p>
              <p className="mt-1">© 2024 Tous droits réservés</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-80 relative z-10">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-card/95 backdrop-blur-sm px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="lg:hidden text-foreground hover:bg-muted/50 p-2 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(true)}
            title="Ouvrir le menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-lg font-semibold text-foreground">
                {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user?.login} ({user?.role === 'gestionnaire' ? 'Gestionnaire' : user?.role === 'comptable' ? 'Comptable' : 'Admin'})
              </span>
              <Button variant="ghost" size="sm" onClick={logout} title="Déconnexion">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <main className="py-6 px-4 sm:px-6 lg:px-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
};
