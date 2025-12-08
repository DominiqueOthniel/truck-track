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
  Landmark,
  Wallet,
  Satellite
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, color: 'from-blue-500 to-cyan-500' },
  { name: 'Camions', href: '/camions', icon: Truck, color: 'from-purple-500 to-pink-500' },
  { name: 'Trajets', href: '/trajets', icon: Route, color: 'from-green-500 to-emerald-500' },
  { name: 'Caisse', href: '/caisse', icon: Wallet, color: 'from-green-500 to-emerald-500' },
  { name: 'Factures', href: '/factures', icon: FileText, color: 'from-indigo-500 to-blue-500' },
  { name: 'Chauffeurs', href: '/chauffeurs', icon: Users, color: 'from-cyan-500 to-teal-500' },
  { name: 'Tiers', href: '/tiers', icon: Building2, color: 'from-violet-500 to-purple-500' },
  { name: 'Banque', href: '/banque', icon: Landmark, color: 'from-amber-500 to-yellow-500' },
];

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Pattern de fond WhatsApp-style */}
      <div 
        className="fixed inset-0 opacity-[0.04] dark:opacity-[0.03] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30,10 L30,50 M10,30 L50,30 M20,20 L40,40 M40,20 L20,40' stroke='%23000000' stroke-width='0.8' fill='none'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden transition-all duration-300",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-80 bg-gradient-to-b from-sidebar to-sidebar/95 border-r border-sidebar-border shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex h-20 items-center justify-between px-6 bg-gradient-to-r from-primary/10 to-transparent border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/50 rounded-xl blur opacity-50" />
                <div className="relative bg-gradient-to-br from-primary to-primary/80 p-2.5 rounded-xl">
                  <Activity className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Truck Track</span>
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
          <nav className="px-4 py-6 space-y-2 overflow-y-auto flex-1">
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
                      ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary font-semibold shadow-md shadow-primary/20" 
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary to-primary/50 rounded-r-full" />
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
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/50 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-3 rounded-2xl shadow-xl">
                <Truck className="h-8 w-8 text-white animate-pulse" />
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
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
                      ? "bg-gradient-to-r from-primary/20 via-primary/15 to-primary/10 text-primary font-semibold shadow-lg shadow-primary/10 transform scale-[1.02]" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground hover:scale-[1.02]"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-gradient-to-b from-primary via-primary to-primary/50 rounded-r-full shadow-lg shadow-primary/50" />
                  )}
                  <div className={cn(
                    "p-2.5 rounded-xl transition-all duration-300 relative",
                    isActive 
                      ? `bg-gradient-to-br ${item.color} shadow-lg shadow-primary/30` 
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
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-lg shadow-primary/50" />
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
          </div>
        </div>

        <main className="py-6 px-4 sm:px-6 lg:px-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
};
