import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  gradient?: string;
  stats?: Array<{
    label: string;
    value: string | number;
    icon?: ReactNode;
    color?: string;
  }>;
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  icon: Icon,
  gradient = 'from-violet-500/20 via-fuchsia-500/10 to-transparent',
  stats,
  actions,
  className
}: PageHeaderProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-xl border bg-card shadow-lg mb-6', className)}>
      {/* Gradient de fond */}
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', gradient)} />
      
      {/* Motif de fond décoratif */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Contenu principal */}
      <div className="relative p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            {Icon && (
              <div className="relative">
                <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full" />
                <div className="relative bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-600 p-4 rounded-2xl shadow-xl">
                  <Icon className="h-8 w-8 text-white" />
                </div>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {title}
              </h1>
              {description && (
                <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
                  {description}
                </p>
              )}
            </div>
          </div>
          
          {actions && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {actions}
            </div>
          )}
        </div>

        {/* Statistiques */}
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-background/50 to-background/30 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative bg-background/60 backdrop-blur-sm rounded-lg p-4 border border-border/50 hover:border-violet-500/50 transition-all duration-300 hover:shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {stat.label}
                    </p>
                    {stat.icon && (
                      <div className={cn(
                        "p-1.5 rounded-md",
                        stat.color || "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                      )}>
                        {stat.icon}
                      </div>
                    )}
                  </div>
                  <p className={cn(
                    "text-2xl font-bold tracking-tight",
                    stat.color || "text-violet-600 dark:text-violet-400"
                  )}>
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ligne de séparation décorative en bas */}
      <div className="h-1 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
    </div>
  );
}

// Composant Badge simplifié pour les statistiques
export function StatBadge({ 
  label, 
  value, 
  variant = 'default' 
}: { 
  label: string; 
  value: string | number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variants = {
    default: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    success: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
  };

  return (
    <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold', variants[variant])}>
      <span className="text-xs opacity-75">{label}:</span>
      <span>{value}</span>
    </div>
  );
}



