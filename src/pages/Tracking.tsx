import { MapPin, Clock, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/PageHeader';

export default function Tracking() {
  return (
    <div className="space-y-6 p-1">
      <PageHeader
        title="Suivi GPS"
        description="Suivi en temps réel de votre flotte"
        icon={MapPin}
        gradient="from-indigo-500/20 via-blue-500/10 to-transparent"
      />

      <Card className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/20">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl scale-150" />
            <div className="relative bg-gradient-to-br from-indigo-500 to-blue-500 p-6 rounded-2xl shadow-xl">
              <MapPin className="h-14 w-14 text-white" />
            </div>
          </div>

          <div className="space-y-3">
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-600 text-sm px-4 py-1.5 gap-2">
              <Wrench className="h-3.5 w-3.5" />
              En développement
            </Badge>
            <h2 className="text-2xl font-bold text-foreground">Suivi en temps réel à venir</h2>
            <p className="text-muted-foreground max-w-md text-base leading-relaxed">
              Le suivi GPS en temps réel de votre flotte sera disponible dans une prochaine mise à jour.
              Vous pourrez visualiser la position de chaque camion sur une carte interactive.
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
