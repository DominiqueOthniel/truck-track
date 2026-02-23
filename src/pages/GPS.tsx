import { Satellite, Clock, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/PageHeader';

export default function GPS() {
  return (
    <div className="space-y-6 p-1">
      <PageHeader
        title="GPS & Trackers"
        description="Configuration et gestion des trackers GPS"
        icon={Satellite}
        gradient="from-blue-500/20 via-cyan-500/10 to-transparent"
      />

      <Card className="border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl scale-150" />
            <div className="relative bg-gradient-to-br from-blue-500 to-cyan-500 p-6 rounded-2xl shadow-xl">
              <Satellite className="h-14 w-14 text-white" />
            </div>
          </div>

          <div className="space-y-3">
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-600 text-sm px-4 py-1.5 gap-2">
              <Wrench className="h-3.5 w-3.5" />
              En développement
            </Badge>
            <h2 className="text-2xl font-bold text-foreground">Fonctionnalité GPS à venir</h2>
            <p className="text-muted-foreground max-w-md text-base leading-relaxed">
              La configuration et le suivi des trackers GPS seront disponibles dans une prochaine mise à jour.
              Cette fonctionnalité permettra de connecter vos appareils GPS et de suivre votre flotte en temps réel.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2.5 mt-2">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>Disponible dans une prochaine version</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
