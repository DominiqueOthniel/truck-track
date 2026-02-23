import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Plus, Edit, Trash2, CreditCard, TrendingUp, TrendingDown,
  Search, CheckCircle2, Clock, AlertTriangle, HardDrive, Upload,
  Banknote, Calendar, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const CREDITS_KEY = 'credits_data';

export type CreditStatut = 'en_cours' | 'solde' | 'en_retard';
export type CreditType = 'emprunt' | 'pret_accorde';

export interface Remboursement {
  id: string;
  date: string;
  montant: number;
  note?: string;
}

export interface Credit {
  id: string;
  type: CreditType;
  intitule: string;
  preteur: string;
  montantTotal: number;
  montantRembourse: number;
  tauxInteret?: number;
  dateDebut: string;
  dateEcheance?: string;
  statut: CreditStatut;
  notes?: string;
  remboursements: Remboursement[];
}

function loadCredits(): Credit[] {
  try {
    const saved = localStorage.getItem(CREDITS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveCredits(credits: Credit[]) {
  localStorage.setItem(CREDITS_KEY, JSON.stringify(credits));
}

const emptyForm = {
  type: 'emprunt' as CreditType,
  intitule: '',
  preteur: '',
  montantTotal: 0,
  tauxInteret: 0,
  dateDebut: new Date().toISOString().split('T')[0],
  dateEcheance: '',
  notes: '',
};

export default function Credits() {
  const { canCreate, canModifyFinancial, canDeleteFinancial } = useAuth();
  const restoreRef = useRef<HTMLInputElement>(null);

  const [credits, setCredits] = useState<Credit[]>(loadCredits);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Remboursement
  const [remboursDialogId, setRemboursDialogId] = useState<string | null>(null);
  const [remboursForm, setRemboursForm] = useState({ date: new Date().toISOString().split('T')[0], montant: 0, note: '' });

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatut, setFilterStatut] = useState('all');

  const persist = (list: Credit[]) => { setCredits(list); saveCredits(list); };

  // Stats
  const emprunts = credits.filter(c => c.type === 'emprunt');
  const prets = credits.filter(c => c.type === 'pret_accorde');
  const totalDu = emprunts.reduce((s, c) => s + (c.montantTotal - c.montantRembourse), 0);
  const totalARecevoir = prets.reduce((s, c) => s + (c.montantTotal - c.montantRembourse), 0);
  const enRetard = credits.filter(c => c.statut === 'en_retard').length;

  // Filtre
  const filtered = credits.filter(c => {
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (filterStatut !== 'all' && c.statut !== filterStatut) return false;
    if (search && !c.intitule.toLowerCase().includes(search.toLowerCase()) &&
        !c.preteur.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.intitule || !form.preteur || form.montantTotal <= 0) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (editingId) {
      const updated = credits.map(c => c.id === editingId
        ? { ...c, ...form, montantTotal: Number(form.montantTotal), tauxInteret: Number(form.tauxInteret) || 0 }
        : c
      );
      persist(updated);
      toast.success('Crédit modifié');
    } else {
      const newCredit: Credit = {
        id: Date.now().toString(),
        ...form,
        montantTotal: Number(form.montantTotal),
        tauxInteret: Number(form.tauxInteret) || 0,
        montantRembourse: 0,
        statut: 'en_cours',
        remboursements: [],
      };
      persist([...credits, newCredit]);
      toast.success('Crédit ajouté');
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (c: Credit) => {
    setEditingId(c.id);
    setForm({
      type: c.type,
      intitule: c.intitule,
      preteur: c.preteur,
      montantTotal: c.montantTotal,
      tauxInteret: c.tauxInteret || 0,
      dateDebut: c.dateDebut,
      dateEcheance: c.dateEcheance || '',
      notes: c.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer ce crédit ?')) return;
    persist(credits.filter(c => c.id !== id));
    toast.success('Crédit supprimé');
  };

  const handleAddRemboursement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remboursDialogId || remboursForm.montant <= 0) return;
    const updated = credits.map(c => {
      if (c.id !== remboursDialogId) return c;
      const newRemb: Remboursement = {
        id: Date.now().toString(),
        date: remboursForm.date,
        montant: Number(remboursForm.montant),
        note: remboursForm.note,
      };
      const totalRemb = c.montantRembourse + newRemb.montant;
      const statut: CreditStatut = totalRemb >= c.montantTotal ? 'solde' : c.statut === 'solde' ? 'en_cours' : c.statut;
      return { ...c, montantRembourse: totalRemb, statut, remboursements: [...c.remboursements, newRemb] };
    });
    persist(updated);
    toast.success('Remboursement enregistré');
    setRemboursDialogId(null);
    setRemboursForm({ date: new Date().toISOString().split('T')[0], montant: 0, note: '' });
  };

  // Backup
  const handleBackup = () => {
    const blob = new Blob([JSON.stringify({ version: '1.0', exportedAt: new Date().toISOString(), credits }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `credits-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success('Backup téléchargé');
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Remplacer tous les crédits actuels ?')) { e.target.value = ''; return; }
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed.credits) throw new Error('Fichier invalide');
      persist(parsed.credits);
      toast.success(`${parsed.credits.length} crédit(s) restauré(s)`);
    } catch { toast.error('Fichier invalide'); }
    e.target.value = '';
  };

  const statutBadge = (s: CreditStatut) => {
    if (s === 'solde') return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-3 w-3 mr-1" />Soldé</Badge>;
    if (s === 'en_retard') return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><AlertTriangle className="h-3 w-3 mr-1" />En retard</Badge>;
    return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><Clock className="h-3 w-3 mr-1" />En cours</Badge>;
  };

  const creditInDialog = credits.find(c => c.id === remboursDialogId);

  return (
    <div className="space-y-6 p-1">
      <PageHeader
        title="Crédits & Prêts"
        description="Gérez vos emprunts et prêts accordés"
        icon={CreditCard}
        gradient="from-rose-500/15 via-pink-500/8 to-transparent"
        iconColor="from-rose-500 via-pink-500 to-red-600"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleBackup} className="gap-2">
              <HardDrive className="h-4 w-4" />Backup
            </Button>
            <Button variant="outline" size="sm" onClick={() => restoreRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />Restaurer
            </Button>
            <input ref={restoreRef} type="file" accept=".json" aria-label="Restaurer crédits" className="hidden" onChange={handleRestore} />
            {canCreate && (
              <Dialog open={isDialogOpen} onOpenChange={o => { setIsDialogOpen(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" />Nouveau crédit</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingId ? 'Modifier le crédit' : 'Nouveau crédit'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Type *</Label>
                        <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as CreditType })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="emprunt">💸 Emprunt (je dois)</SelectItem>
                            <SelectItem value="pret_accorde">🤝 Prêt accordé (on me doit)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Montant total (FCFA) *</Label>
                        <Input type="number" min="0" className="mt-1" value={form.montantTotal || ''} onChange={e => setForm({ ...form, montantTotal: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div>
                      <Label>Intitulé *</Label>
                      <Input className="mt-1" placeholder="Ex: Prêt banque UBA, Avance fournisseur..." value={form.intitule} onChange={e => setForm({ ...form, intitule: e.target.value })} />
                    </div>
                    <div>
                      <Label>{form.type === 'emprunt' ? 'Prêteur / Créancier *' : 'Emprunteur *'}</Label>
                      <Input className="mt-1" placeholder="Nom de la personne ou banque" value={form.preteur} onChange={e => setForm({ ...form, preteur: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Taux d'intérêt (%)</Label>
                        <Input type="number" min="0" step="0.1" className="mt-1" value={form.tauxInteret || ''} onChange={e => setForm({ ...form, tauxInteret: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label>Date début *</Label>
                        <Input type="date" className="mt-1" value={form.dateDebut} onChange={e => setForm({ ...form, dateDebut: e.target.value })} />
                      </div>
                      <div>
                        <Label>Date échéance</Label>
                        <Input type="date" className="mt-1" value={form.dateEcheance} onChange={e => setForm({ ...form, dateEcheance: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Input className="mt-1" placeholder="Remarques..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button type="submit" className="flex-1">{editingId ? 'Modifier' : 'Ajouter'}</Button>
                      <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Annuler</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Emprunts actifs</p>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{emprunts.filter(c => c.statut === 'en_cours').length}</p>
            <p className="text-xs text-muted-foreground mt-1">Dû : {totalDu.toLocaleString('fr-FR')} FCFA</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Prêts accordés</p>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{prets.filter(c => c.statut === 'en_cours').length}</p>
            <p className="text-xs text-muted-foreground mt-1">À recevoir : {totalARecevoir.toLocaleString('fr-FR')} FCFA</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">En retard</p>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{enRetard}</p>
            <p className="text-xs text-muted-foreground mt-1">Échéance dépassée</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Soldés</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{credits.filter(c => c.statut === 'solde').length}</p>
            <p className="text-xs text-muted-foreground mt-1">Remboursés</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tous types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="emprunt">💸 Emprunts</SelectItem>
            <SelectItem value="pret_accorde">🤝 Prêts accordés</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tous statuts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="en_retard">En retard</SelectItem>
            <SelectItem value="solde">Soldé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tableau */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="border-b bg-muted/20 py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Crédits & Prêts
            <Badge variant="secondary" className="ml-2">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Banknote className="h-10 w-10 opacity-30" />
              <p className="text-sm">Aucun crédit enregistré</p>
              {canCreate && <Button size="sm" onClick={() => setIsDialogOpen(true)} className="gap-2 mt-2"><Plus className="h-4 w-4" />Ajouter un crédit</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="min-w-[180px]">Intitulé</TableHead>
                    <TableHead className="min-w-[120px]">Type</TableHead>
                    <TableHead className="min-w-[140px]">Contrepartie</TableHead>
                    <TableHead className="min-w-[200px]">Progression</TableHead>
                    <TableHead className="min-w-[100px]">Échéance</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right min-w-[160px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => {
                    const restant = c.montantTotal - c.montantRembourse;
                    const pct = c.montantTotal > 0 ? Math.min(100, (c.montantRembourse / c.montantTotal) * 100) : 0;
                    const isRetard = c.dateEcheance && c.statut !== 'solde' && new Date(c.dateEcheance) < new Date();
                    return (
                      <TableRow key={c.id} className="hover:bg-muted/20">
                        <TableCell>
                          <div>
                            <p className="font-semibold text-sm">{c.intitule}</p>
                            {c.tauxInteret ? <p className="text-xs text-muted-foreground">Taux : {c.tauxInteret}%</p> : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', c.type === 'emprunt' ? 'border-red-300 text-red-600 dark:text-red-400' : 'border-green-300 text-green-600 dark:text-green-400')}>
                            {c.type === 'emprunt' ? '💸 Emprunt' : '🤝 Prêt accordé'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{c.preteur}</TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[160px]">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{c.montantRembourse.toLocaleString('fr-FR')} FCFA</span>
                              <span>{c.montantTotal.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                            <Progress value={pct} className="h-1.5" />
                            <p className="text-xs text-muted-foreground">Restant : {restant.toLocaleString('fr-FR')} FCFA ({pct.toFixed(0)}%)</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {c.dateEcheance ? (
                            <div className={cn('flex items-center gap-1 text-xs', isRetard ? 'text-red-500' : 'text-muted-foreground')}>
                              <Calendar className="h-3 w-3" />
                              {new Date(c.dateEcheance).toLocaleDateString('fr-FR')}
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>{statutBadge(c.statut)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {c.statut !== 'solde' && (canCreate || canModifyFinancial) && (
                              <Button size="sm" variant="outline" className="gap-1 text-xs h-8 border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                                onClick={() => { setRemboursDialogId(c.id); setRemboursForm({ date: new Date().toISOString().split('T')[0], montant: 0, note: '' }); }}>
                                <RotateCcw className="h-3 w-3" />Rembours.
                              </Button>
                            )}
                            {canModifyFinancial && (
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEdit(c)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDeleteFinancial && (
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog remboursement */}
      <Dialog open={!!remboursDialogId} onOpenChange={o => { if (!o) setRemboursDialogId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-green-500" />
              Enregistrer un remboursement
            </DialogTitle>
          </DialogHeader>
          {creditInDialog && (
            <div className="mb-4 p-3 bg-muted/40 rounded-xl text-sm space-y-1">
              <p className="font-semibold">{creditInDialog.intitule}</p>
              <p className="text-muted-foreground">Restant dû : <span className="font-semibold text-foreground">{(creditInDialog.montantTotal - creditInDialog.montantRembourse).toLocaleString('fr-FR')} FCFA</span></p>
            </div>
          )}
          <form onSubmit={handleAddRemboursement} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Montant (FCFA) *</Label>
                <Input type="number" min="1" className="mt-1" value={remboursForm.montant || ''} onChange={e => setRemboursForm({ ...remboursForm, montant: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Date *</Label>
                <Input type="date" className="mt-1" value={remboursForm.date} onChange={e => setRemboursForm({ ...remboursForm, date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Note</Label>
              <Input className="mt-1" placeholder="Ex: virement, espèces..." value={remboursForm.note} onChange={e => setRemboursForm({ ...remboursForm, note: e.target.value })} />
            </div>
            {/* Historique */}
            {creditInDialog?.remboursements.length ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Historique</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {creditInDialog.remboursements.slice().reverse().map(r => (
                    <div key={r.id} className="flex justify-between text-xs bg-muted/40 px-3 py-1.5 rounded-lg">
                      <span className="text-muted-foreground">{new Date(r.date).toLocaleDateString('fr-FR')}{r.note ? ` · ${r.note}` : ''}</span>
                      <span className="font-semibold text-green-600">+{r.montant.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex gap-2 pt-1">
              <Button type="submit" className="flex-1 gap-2"><CheckCircle2 className="h-4 w-4" />Enregistrer</Button>
              <Button type="button" variant="outline" onClick={() => setRemboursDialogId(null)}>Annuler</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
