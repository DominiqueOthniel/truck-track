import React from 'react';
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
  Building2,
  MapPin,
  Loader2,
  AlertCircle,
  LogOut,
  Landmark,
  Wallet,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const navigation = [
  { name: 'Dashboard',  href: '/',          icon: LayoutDashboard, color: 'from-violet-500 to-indigo-500' },
  { name: 'Camions',    href: '/camions',    icon: Truck,           color: 'from-purple-500 to-pink-500' },
  { name: 'Trajets',    href: '/trajets',    icon: Route,           color: 'from-emerald-500 to-teal-500' },
  { name: 'Dépenses',   href: '/depenses',   icon: DollarSign,      color: 'from-orange-500 to-red-500' },
  { name: 'Factures',   href: '/factures',   icon: FileText,        color: 'from-blue-500 to-cyan-500' },
  { name: 'Chauffeurs', href: '/chauffeurs', icon: Users,           color: 'from-cyan-500 to-sky-500' },
  { name: 'Tiers',      href: '/tiers',      icon: Building2,       color: 'from-violet-500 to-purple-500' },
  { name: 'Banque',     href: '/banque',     icon: Landmark,        color: 'from-amber-500 to-yellow-500' },
  { name: 'Caisse',     href: '/caisse',     icon: Wallet,          color: 'from-green-500 to-emerald-500' },
  { name: 'Crédits',    href: '/credits',    icon: CreditCard,      color: 'from-rose-500 to-pink-500' },
  { name: 'Suivi GPS',  href: '/suivi',      icon: MapPin,          color: 'from-sky-500 to-blue-500' },
];

function NavItem({
  item,
  isActive,
  onClick,
}: {
  item: typeof navigation[0];
  isActive: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 select-none',
        isActive
          ? 'bg-white/10 text-white font-semibold shadow-sm'
          : 'text-sidebar-foreground/60 hover:bg-white/5 hover:text-sidebar-foreground/90'
      )}
    >
      {/* Indicateur actif */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gradient-to-b from-violet-400 to-indigo-400 rounded-r-full" />
      )}

      {/* Icône */}
      <div className={cn(
        'p-2 rounded-lg flex-shrink-0 transition-all duration-200',
        isActive
          ? `bg-gradient-to-br ${item.color} shadow-md`
          : 'bg-white/5 group-hover:bg-white/10'
      )}>
        <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-sidebar-foreground/70')} />
      </div>

      <span className="text-sm flex-1 truncate">{item.name}</span>

      {isActive && (
        <ChevronRight className="h-3.5 w-3.5 text-white/50 flex-shrink-0" />
      )}
    </Link>
  );
}

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading, apiError } = useApp();
  const { user, logout } = useAuth();

  const currentPage = navigation.find(item => item.href === location.pathname)?.name || 'Dashboard';

  const roleLabel = user?.role === 'gestionnaire' ? 'Gestionnaire'
    : user?.role === 'comptable' ? 'Comptable'
    : 'Administrateur';

  const roleColor = user?.role === 'gestionnaire' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
    : user?.role === 'comptable' ? 'bg-blue-500/15 text-blue-400 border-blue-500/20'
    : 'bg-violet-500/15 text-violet-400 border-violet-500/20';

  return (
    <div className="min-h-screen bg-background relative">
      {/* Alertes système */}
      {apiError && (
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0 z-50 relative">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {apiError} — Vérifiez que le backend est démarré (npm run start:dev dans backend/)
          </AlertDescription>
        </Alert>
      )}
      {isLoading && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/5 border-b border-primary/10 text-xs text-muted-foreground z-50 relative">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          Synchronisation des données...
        </div>
      )}

      {/* Grille de fond subtile */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.025] dark:opacity-[0.03] bg-[linear-gradient(to_right,hsl(252,87%,62%)_1px,transparent_1px),linear-gradient(to_bottom,hsl(252,87%,62%)_1px,transparent_1px)] bg-[size:32px_32px]" />

      {/* ===== OVERLAY MOBILE ===== */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== SIDEBAR MOBILE ===== */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 lg:hidden transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent
          navigation={navigation}
          location={location}
          user={user}
          roleLabel={roleLabel}
          roleColor={roleColor}
          logout={logout}
          onNavClick={() => setSidebarOpen(false)}
          closeSidebar={() => setSidebarOpen(false)}
        />
      </div>

      {/* ===== SIDEBAR DESKTOP ===== */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:z-30">
        <SidebarContent
          navigation={navigation}
          location={location}
          user={user}
          roleLabel={roleLabel}
          roleColor={roleColor}
          logout={logout}
        />
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="lg:pl-64 relative z-10">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/60 bg-card/90 backdrop-blur-md px-4 sm:px-6 shadow-sm">
          {/* Bouton menu mobile */}
          <button
            type="button"
            className="lg:hidden flex items-center justify-center h-9 w-9 rounded-xl bg-muted/60 hover:bg-muted text-foreground transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Titre de la page courante */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs text-muted-foreground hidden sm:inline">Truck Track</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 hidden sm:inline" />
            <h1 className="text-sm font-semibold text-foreground truncate">{currentPage}</h1>
          </div>

          {/* Utilisateur + déconnexion */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={cn('hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium', roleColor)}>
              <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              {user?.login} · {roleLabel}
            </div>
            <button
          onClick={logout}
          title="Déconnexion"
          aria-label="Déconnexion"
          className="flex items-center justify-center h-8 w-8 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="py-5 px-4 sm:px-6 lg:px-7 min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
};

type NavEntry = { name: string; href: string; icon: React.ElementType; color: string };

function SidebarContent({
  navigation,
  location,
  user,
  roleLabel,
  roleColor,
  logout,
  onNavClick,
  closeSidebar,
}: {
  navigation: NavEntry[];
  location: ReturnType<typeof useLocation>;
  user: any;
  roleLabel: string;
  roleColor: string;
  logout: () => void;
  onNavClick?: () => void;
  closeSidebar?: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">

      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-sidebar-border/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl blur-md opacity-60" />
            <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-2 rounded-xl shadow-lg">
              <Truck className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <p className="font-bold text-sm text-sidebar-foreground leading-none">Truck Track</p>
            <p className="text-[10px] text-sidebar-foreground/40 leading-none mt-0.5">Cameroun</p>
          </div>
        </div>
        {closeSidebar && (
          <button
            onClick={closeSidebar}
            aria-label="Fermer le menu"
            title="Fermer"
            className="text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-white/5 p-1.5 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Utilisateur */}
      <div className="px-4 py-3 border-b border-sidebar-border/30 flex-shrink-0">
        <div className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-xl border', roleColor)}>
          <div className="w-7 h-7 rounded-lg bg-current/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold uppercase">{user?.login?.[0]}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{user?.login}</p>
            <p className="text-[10px] opacity-70 truncate">{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-3 mb-2">Navigation</p>
        {navigation.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={location.pathname === item.href}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-sidebar-border/30 flex-shrink-0">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/50 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 text-sm group"
        >
          <div className="p-2 rounded-lg bg-white/5 group-hover:bg-red-500/15 transition-colors">
            <LogOut className="h-4 w-4" />
          </div>
          Déconnexion
        </button>
        <p className="text-center text-[10px] text-sidebar-foreground/25 mt-3">
          © {new Date().getFullYear()} Truck Track
        </p>
      </div>
    </div>
  );
}
