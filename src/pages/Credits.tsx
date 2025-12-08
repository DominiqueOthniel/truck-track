import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { NumberInput } from '@/components/ui/number-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit, CreditCard, Search, X, FileDown, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { exportToExcel, exportToPrintablePDF } from '@/lib/export-utils';

export interface Credit {
  id: string;
  clientId: string;
  montant: number;
  dateCreation: string;
  dateEcheance?: string;
  statut: 'actif' | 'rembourse' | 'expire';
  description?: string;
  factureId?: string;
  notes?: string;
}

export default function Credits() {
  const navigate = useNavigate();
  const { thirdParties, invoices } = useApp();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    clientId: '',
    montant: 0,
    dateCreation: new Date().toISOString().split('T')[0],
    dateEcheance: '',
    statut: 'actif' as Credit['statut'],
    description: '',
    factureId: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      clientId: '',
      montant: 0,
      dateCreation: new Date().toISOString().split('T')[0],
      dateEcheance: '',
      statut: 'actif',
      description: '',
      factureId: '',
      notes: '',
    });
    setEditingCredit(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId) {
      toast.error('Veuillez sélectionner un client');
      return;
    }

    if (formData.montant <= 0) {
      toast.error('Le montant doit être supérieur à 0');
      return;
    }

    if (editingCredit) {
      setCredits(credits.map(c => 
        c.id === editingCredit.id 
          ? { ...formData, id: editingCredit.id }
          : c
      ));
      toast.success('Crédit modifié avec succès');
    } else {
      const newCredit: Credit = {
        id: Date.now().toString(),
        ...formData,
      };
      setCredits([...credits, newCredit]);
      toast.success('Crédit ajouté avec succès');
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (credit: Credit) => {
    setEditingCredit(credit);
    setFormData({
      clientId: credit.clientId,
      montant: credit.montant,
      dateCreation: credit.dateCreation,
      dateEcheance: credit.dateEcheance || '',
      statut: credit.statut,
      description: credit.description || '',
      factureId: credit.factureId || '',
      notes: credit.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const credit = credits.find(c => c.id === id);
    if (!credit) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer ce crédit ?`)) {
      setCredits(credits.filter(c => c.id !== id));
      toast.success('Crédit supprimé');
    }
  };

  const handleRembourser = (id: string) => {
    const credit = credits.find(c => c.id === id);
    if (!credit) return;

    if (credit.statut === 'rembourse') {
      toast.error('Ce crédit est déjà remboursé');
      return;
    }

    if (credit.statut === 'expire') {
      toast.error('Un crédit expiré ne peut pas être remboursé');
      return;
    }

    if (confirm(`Marquer le crédit de ${getClientName(credit.clientId)} (${credit.montant.toLocaleString('fr-FR')} FCFA) comme remboursé ?`)) {
      setCredits(credits.map(c => 
        c.id === id 
          ? { ...c, statut: 'rembourse' as Credit['statut'] }
          : c
      ));
      toast.success('Crédit marqué comme remboursé');
    }
  };

  const getClientName = (clientId: string) => {
    const client = thirdParties.find(tp => tp.id === clientId);
    return client ? client.nom : 'N/A';
  };

  const filteredCredits = credits.filter(credit => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const clientName = getClientName(credit.clientId).toLowerCase();
      return (
        clientName.includes(search) ||
        credit.description?.toLowerCase().includes(search) ||
        credit.montant.toString().includes(search) ||
        credit.id.includes(search)
      );
    }
    return true;
  });

  const creditsActifs = credits.filter(c => c.statut === 'actif').length;
  const creditsRembourses = credits.filter(c => c.statut === 'rembourse').length;
  const montantTotal = credits.reduce((sum, c) => sum + c.montant, 0);
  const montantActif = credits.filter(c => c.statut === 'actif').reduce((sum, c) => sum + c.montant, 0);

  const getFiltersDescription = () => {
    const filters: string[] = [];
    if (searchTerm) filters.push(`Recherche: "${searchTerm}"`);
    return filters.length > 0 ? `Filtres appliqués: ${filters.join(', ')}` : undefined;
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: 'Liste des Crédits',
      fileName: `credits_${new Date().toISOString().split('T')[0]}.xlsx`,
      filtersDescription: getFiltersDescription(),
      columns: [
        { header: 'Client', value: (c) => getClientName(c.clientId) },
        { header: 'Montant', value: (c) => c.montant.toLocaleString('fr-FR') },
        { header: 'Date Création', value: (c) => new Date(c.dateCreation).toLocaleDateString('fr-FR') },
        { header: 'Date Échéance', value: (c) => c.dateEcheance ? new Date(c.dateEcheance).toLocaleDateString('fr-FR') : '-' },
        { header: 'Statut', value: (c) => c.statut === 'actif' ? 'Actif' : c.statut === 'rembourse' ? 'Remboursé' : 'Expiré' },
        { header: 'Description', value: (c) => c.description || '-' },
        { header: 'Notes', value: (c) => c.notes || '-' },
      ],
      rows: filteredCredits,
    });
    toast.success('Export Excel généré avec succès');
  };

  const handleExportPDF = () => {
    exportToPrintablePDF({
      title: 'Liste des Crédits',
      filtersDescription: getFiltersDescription(),
      columns: [
        { header: 'Client', value: (c) => getClientName(c.clientId) },
        { header: 'Montant', value: (c) => c.montant.toLocaleString('fr-FR') },
        { header: 'Date Création', value: (c) => new Date(c.dateCreation).toLocaleDateString('fr-FR') },
        { header: 'Date Échéance', value: (c) => c.dateEcheance ? new Date(c.dateEcheance).toLocaleDateString('fr-FR') : '-' },
        { header: 'Statut', value: (c) => c.statut === 'actif' ? 'Actif' : c.statut === 'rembourse' ? 'Remboursé' : 'Expiré' },
        { header: 'Description', value: (c) => c.description || '-' },
      ],
      rows: filteredCredits,
    });
  };

  const getStatusColor = (statut: Credit['statut']) => {
    switch (statut) {
      case 'actif':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400';
      case 'rembourse':
        return 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400';
      case 'expire':
        return 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400';
    }
  };

  const getStatusLabel = (statut: Credit['statut']) => {
    switch (statut) {
      case 'actif':
        return 'Actif';
      case 'rembourse':
        return 'Remboursé';
      case 'expire':
        return 'Expiré';
    }
  };

  // Obtenir les clients (tiers de type client)
  const clients = thirdParties.filter(tp => tp.type === 'client');

  return (
    <div className="space-y-6 p-1">
      <PageHeader
        title="Gestion des Crédits"
        description="Gérez les crédits accordés aux clients"
        icon={CreditCard}
        gradient="from-emerald-500/20 via-teal-500/10 to-transparent"
        stats={[
          {
            label: 'Total Crédits',
            value: credits.length,
            icon: <CreditCard className="h-4 w-4" />,
            color: 'text-emerald-600 dark:text-emerald-400'
          },
          {
            label: 'Actifs',
            value: creditsActifs,
            icon: <CreditCard className="h-4 w-4" />,
            color: 'text-blue-600 dark:text-blue-400'
          },
          {
            label: 'Remboursés',
            value: creditsRembourses,
            icon: <CreditCard className="h-4 w-4" />,
            color: 'text-green-600 dark:text-green-400'
          },
          {
            label: 'Montant Actif',
            value: montantActif.toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
            icon: <CreditCard className="h-4 w-4" />,
            color: 'text-purple-600 dark:text-purple-400'
          }
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel} className="shadow-md hover:shadow-lg transition-all duration-300">
              <FileDown className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" onClick={handleExportPDF} className="shadow-md hover:shadow-lg transition-all duration-300">
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsDialogOpen(true)} className="shadow-md hover:shadow-lg transition-all duration-300">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un crédit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingCredit ? 'Modifier le crédit' : 'Ajouter un crédit'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="clientId">Client *</Label>
                    <Select 
                      value={formData.clientId} 
                      onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground text-center">
                            Aucun client disponible. Veuillez d'abord ajouter des clients dans la section Tiers.
                          </div>
                        ) : (
                          clients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.nom}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="montant">Montant (FCFA) *</Label>
                      <NumberInput
                        id="montant"
                        value={formData.montant}
                        onChange={(value) => setFormData({ ...formData, montant: value || 0 })}
                        placeholder="0"
                        min={0}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="statut">Statut *</Label>
                      <Select 
                        value={formData.statut} 
                        onValueChange={(value) => setFormData({ ...formData, statut: value as Credit['statut'] })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="actif">Actif</SelectItem>
                          <SelectItem value="rembourse">Remboursé</SelectItem>
                          <SelectItem value="expire">Expiré</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dateCreation">Date de création *</Label>
                      <Input
                        id="dateCreation"
                        type="date"
                        value={formData.dateCreation}
                        onChange={(e) => setFormData({ ...formData, dateCreation: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="dateEcheance">Date d'échéance</Label>
                      <Input
                        id="dateEcheance"
                        type="date"
                        value={formData.dateEcheance}
                        onChange={(e) => setFormData({ ...formData, dateEcheance: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="factureId">Lier à une facture (optionnel)</Label>
                    <Select 
                      value={formData.factureId || 'none'} 
                      onValueChange={(value) => setFormData({ ...formData, factureId: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une facture" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune facture</SelectItem>
                        {invoices.map(invoice => (
                          <SelectItem key={invoice.id} value={invoice.id}>
                            {invoice.numero} - {invoice.montantTTC.toLocaleString('fr-FR')} FCFA
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Description du crédit..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notes complémentaires..."
                      rows={2}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    {editingCredit ? 'Modifier' : 'Ajouter'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-br from-background to-muted/20 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Recherche
            </CardTitle>
            {searchTerm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par client, montant, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Liste des Crédits</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCredits.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Aucun crédit ne correspond à votre recherche' 
                  : 'Aucun crédit enregistré'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date Création</TableHead>
                  <TableHead>Date Échéance</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCredits.map((credit) => (
                  <TableRow key={credit.id}>
                    <TableCell className="font-medium">{getClientName(credit.clientId)}</TableCell>
                    <TableCell>{credit.montant.toLocaleString('fr-FR')} FCFA</TableCell>
                    <TableCell>{new Date(credit.dateCreation).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>{credit.dateEcheance ? new Date(credit.dateEcheance).toLocaleDateString('fr-FR') : '-'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(credit.statut)}>
                        {getStatusLabel(credit.statut)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{credit.description || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {credit.statut === 'actif' && (
                          <Button 
                            size="sm" 
                            variant="default" 
                            onClick={() => handleRembourser(credit.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            title="Marquer comme remboursé"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEdit(credit)}
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleDelete(credit.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}







