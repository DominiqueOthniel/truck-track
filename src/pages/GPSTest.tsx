import { Satellite, Clock, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/PageHeader';

export default function GPSTest() {
  return (
    <div className="space-y-6 p-1">
      <PageHeader
        title="Test GPS"
        description="Diagnostic et test des appareils GPS"
        icon={Satellite}
        gradient="from-cyan-500/20 via-teal-500/10 to-transparent"
      />

      <Card className="border-2 border-dashed border-cyan-300 dark:border-cyan-700 bg-cyan-50/50 dark:bg-cyan-950/20">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl scale-150" />
            <div className="relative bg-gradient-to-br from-cyan-500 to-teal-500 p-6 rounded-2xl shadow-xl">
              <Satellite className="h-14 w-14 text-white" />
            </div>
          </div>

          <div className="space-y-3">
            <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-600 text-sm px-4 py-1.5 gap-2">
              <Wrench className="h-3.5 w-3.5" />
              En développement
            </Badge>
            <h2 className="text-2xl font-bold text-foreground">Diagnostic GPS à venir</h2>
            <p className="text-muted-foreground max-w-md text-base leading-relaxed">
              L'outil de test et de diagnostic des trackers GPS sera disponible dans une prochaine mise à jour.
              Il permettra de vérifier la connectivité et le bon fonctionnement de vos appareils.
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
