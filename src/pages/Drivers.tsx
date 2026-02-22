import { useState } from 'react';
import { useApp, Driver } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TrendingUp, TrendingDown, Trash2, Users, UserCheck, DollarSign, Route, Filter, X, Search, FileDown, FileText, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { canDeleteDriver, isDriverOnMission, calculateDriverStats, calculateDriverStatsFromTripsAndExpenses } from '@/lib/sync-utils';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { exportToExcel, exportToPrintablePDF } from '@/lib/export-utils';
import { EMOJI } from '@/lib/emoji-palette';

export default function Drivers() {
  const { drivers, trips, expenses, createDriver, updateDriver, deleteDriver } = useApp();
  const { canCreate, canModifyNonFinancial, canDeleteNonFinancial } = useAuth();
  const [isAddDriverDialogOpen, setIsAddDriverDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'en_mission' | 'disponible'>('all');
  const [filterSolde, setFilterSolde] = useState<'all' | 'positif' | 'negatif' | 'zero'>('all');
  const [filterMinTrips, setFilterMinTrips] = useState<string>('');
  const [filterMaxTrips, setFilterMaxTrips] = useState<string>('');

  const [driverForm, setDriverForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    cni: '',
    photo: '',
  });

  const [photoPreview, setPhotoPreview] = useState<string>('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        setDriverForm({ ...driverForm, photo: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const resetDriverForm = () => {
    setDriverForm({ nom: '', prenom: '', telephone: '', cni: '', photo: '' });
    setPhotoPreview('');
    setEditingDriver(null);
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setDriverForm({
      nom: driver.nom,
      prenom: driver.prenom,
      telephone: driver.telephone,
      cni: driver.cni || '',
      photo: driver.photo || '',
    });
    setPhotoPreview(driver.photo || '');
    setIsAddDriverDialogOpen(true);
  };


  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingDriver) {
        await updateDriver(editingDriver.id, {
          nom: driverForm.nom,
          prenom: driverForm.prenom,
          telephone: driverForm.telephone,
          cni: driverForm.cni || undefined,
          photo: driverForm.photo || undefined,
        });
        toast.success('Chauffeur modifié avec succès');
      } else {
        await createDriver({
          nom: driverForm.nom,
          prenom: driverForm.prenom,
          telephone: driverForm.telephone,
          cni: driverForm.cni || undefined,
          photo: driverForm.photo || undefined,
          transactions: [],
        });
        toast.success('Chauffeur ajouté avec succès');
      }
      setIsAddDriverDialogOpen(false);
      resetDriverForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'opération');
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (isDriverOnMission(id, trips)) {
      toast.error('Impossible de supprimer ce chauffeur : il est assigné à un trajet en cours ou planifié');
      return;
    }

    if (!canDeleteDriver(id, trips)) {
      toast.error('Impossible de supprimer ce chauffeur : il a des trajets actifs');
      return;
    }

    const driver = drivers.find(d => d.id === id);
    if (driver) {
      const stats = getDriverStats(driver);
      const tripsCount = trips.filter(t => t.chauffeurId === id).length;
      
      if (confirm(
        `Êtes-vous sûr de vouloir supprimer ${driver.prenom} ${driver.nom} ?\n\n` +
        `Statistiques :\n` +
        `- ${tripsCount} trajets effectués\n` +
        `- ${stats.apports.toLocaleString('fr-FR')} FCFA d'apports\n` +
        `- ${stats.sorties.toLocaleString('fr-FR')} FCFA de sorties\n` +
        `- Solde: ${stats.balance.toLocaleString('fr-FR')} FCFA\n\n` +
        `L'historique de ses transactions manuelles sera perdu.`
      )) {
        try {
          await deleteDriver(id);
          toast.success('Chauffeur supprimé');
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
        }
      }
    }
  };

  const getDriverStats = (driver: Driver) =>
    calculateDriverStatsFromTripsAndExpenses(driver.id, driver, trips, expenses);

  const calculateBalance = (driver: Driver) => getDriverStats(driver).balance;

  // Filtrer les chauffeurs par les infos
  const filteredDrivers = drivers.filter(driver => {
    // Recherche générale
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesPrenom = driver.prenom.toLowerCase().includes(search);
      const matchesNom = driver.nom.toLowerCase().includes(search);
      const matchesTelephone = driver.telephone.includes(search);
      const matchesCni = driver.cni?.toLowerCase().includes(search);
      
      if (!matchesPrenom && !matchesNom && !matchesTelephone && !matchesCni) {
        return false;
      }
    }
    
    // Filtre par statut (en mission / disponible)
    if (filterStatus !== 'all') {
      const onMission = isDriverOnMission(driver.id, trips);
      if (filterStatus === 'en_mission' && !onMission) return false;
      if (filterStatus === 'disponible' && onMission) return false;
    }
    
    // Filtre par solde
    if (filterSolde !== 'all') {
      const balance = calculateBalance(driver);
      if (filterSolde === 'positif' && balance <= 0) return false;
      if (filterSolde === 'negatif' && balance >= 0) return false;
      if (filterSolde === 'zero' && balance !== 0) return false;
    }
    
    // Filtre par nombre de trajets
    const tripsCount = trips.filter(t => t.chauffeurId === driver.id).length;
    if (filterMinTrips && tripsCount < parseInt(filterMinTrips)) return false;
    if (filterMaxTrips && tripsCount > parseInt(filterMaxTrips)) return false;
    
    return true;
  });

  // Calculer les statistiques
  const driversOnMission = drivers.filter(d => isDriverOnMission(d.id, trips)).length;
  const totalBalance = drivers.reduce((sum, d) => sum + calculateBalance(d), 0);
  const positiveBalance = drivers.filter(d => calculateBalance(d) > 0).length;

  // Fonction pour générer la description des filtres
  const getFiltersDescription = () => {
    const filters: string[] = [];
    if (searchTerm) filters.push(`Recherche: "${searchTerm}"`);
    if (filterStatus !== 'all') filters.push(`Statut: ${filterStatus === 'en_mission' ? 'En mission' : 'Disponible'}`);
    if (filterSolde !== 'all') {
      const soldeLabels: Record<string, string> = { positif: 'Positif', negatif: 'Négatif', zero: 'Zéro' };
      filters.push(`Solde: ${soldeLabels[filterSolde]}`);
    }
    if (filterMinTrips) filters.push(`Min trajets: ${filterMinTrips}`);
    if (filterMaxTrips) filters.push(`Max trajets: ${filterMaxTrips}`);
    return filters.length > 0 ? `Filtres appliqués: ${filters.join(', ')}` : undefined;
  };

  // Fonctions d'export
  const handleExportExcel = () => {
    exportToExcel({
      title: 'Liste des Chauffeurs',
      fileName: `chauffeurs_${new Date().toISOString().split('T')[0]}.xlsx`,
      filtersDescription: getFiltersDescription(),
      columns: [
        { header: 'Prénom', value: (d) => d.prenom },
        { header: 'Nom', value: (d) => d.nom },
        { header: 'Téléphone', value: (d) => d.telephone },
        { header: 'CNI', value: (d) => d.cni || '-' },
        { header: 'Statut', value: (d) => isDriverOnMission(d.id, trips) ? 'En mission' : 'Disponible' },
        { header: 'Nb. Trajets', value: (d) => trips.filter(t => t.chauffeurId === d.id).length },
        { header: 'Apports (FCFA)', value: (d) => getDriverStats(d).apports },
        { header: 'Sorties (FCFA)', value: (d) => getDriverStats(d).sorties },
        { header: 'Solde (FCFA)', value: (d) => getDriverStats(d).balance },
      ],
      rows: filteredDrivers,
    });
    toast.success('Export Excel généré avec succès');
  };

  const handleExportPDF = () => {
    // Calculer les totaux (trajets + dépenses + transactions manuelles)
    const totalApports = filteredDrivers.reduce((sum, d) => sum + getDriverStats(d).apports, 0);
    const totalSorties = filteredDrivers.reduce((sum, d) => sum + getDriverStats(d).sorties, 0);
    const totalSolde = totalApports - totalSorties;
    const totalTrajets = filteredDrivers.reduce((sum, d) => sum + trips.filter(t => t.chauffeurId === d.id).length, 0);

    exportToPrintablePDF({
      title: 'Liste des Chauffeurs',
      fileName: `chauffeurs_${new Date().toISOString().split('T')[0]}.pdf`,
      filtersDescription: getFiltersDescription(),
      // Couleurs thématiques pour les chauffeurs (violet/rose)
      headerColor: '#7c3aed',
      headerTextColor: '#ffffff',
      evenRowColor: '#faf5ff',
      oddRowColor: '#ffffff',
      accentColor: '#7c3aed',
      totals: [
        { label: 'Total Trajets', value: totalTrajets, style: 'neutral', icon: EMOJI.camion },
        { label: 'Total Apports', value: `+${totalApports.toLocaleString('fr-FR')} FCFA`, style: 'positive', icon: EMOJI.entree },
        { label: 'Total Sorties', value: `-${totalSorties.toLocaleString('fr-FR')} FCFA`, style: 'negative', icon: EMOJI.sortie },
        { label: 'Solde Global', value: `${totalSolde >= 0 ? '+' : ''}${totalSolde.toLocaleString('fr-FR')} FCFA`, style: totalSolde >= 0 ? 'positive' : 'negative', icon: EMOJI.argent },
      ],
      columns: [
        { header: 'Prénom', value: (d) => d.prenom },
        { header: 'Nom', value: (d) => d.nom },
        { header: 'Téléphone', value: (d) => `${EMOJI.telephone} ${d.telephone}` },
        { header: 'CNI', value: (d) => d.cni ? `🪪 ${d.cni}` : '-' },
        { header: 'Statut', value: (d) => isDriverOnMission(d.id, trips) ? `${EMOJI.camion} En mission` : `${EMOJI.succes} Disponible` },
        { header: 'Nb. Trajets', value: (d) => trips.filter(t => t.chauffeurId === d.id).length },
        { 
          header: 'Apports (FCFA)', 
          value: (d) => `+${getDriverStats(d).apports.toLocaleString('fr-FR')}`,
          cellStyle: (d) => getDriverStats(d).apports > 0 ? 'positive' : 'neutral'
        },
        { 
          header: 'Sorties (FCFA)', 
          value: (d) => `-${getDriverStats(d).sorties.toLocaleString('fr-FR')}`,
          cellStyle: (d) => getDriverStats(d).sorties > 0 ? 'negative' : 'neutral'
        },
        { 
          header: 'Solde (FCFA)', 
          value: (d) => {
            const balance = getDriverStats(d).balance;
            return balance >= 0 ? `+${balance.toLocaleString('fr-FR')}` : balance.toLocaleString('fr-FR');
          },
          cellStyle: (d) => getDriverStats(d).balance >= 0 ? 'positive' : 'negative'
        },
      ],
      rows: filteredDrivers,
    });
  };

  // Export PDF détaillé avec toutes les transactions/opérations
  const handleExportDetailedPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const currentDate = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Générer le HTML pour chaque chauffeur avec ses transactions (trajets + dépenses + manuelles)
    const driversContent = filteredDrivers.map(driver => {
      const stats = getDriverStats(driver);
      const { balance, apports, sorties, allTransactions } = stats;
      const tripsCount = trips.filter(t => t.chauffeurId === driver.id).length;
      const onMission = isDriverOnMission(driver.id, trips);

      const transactionsRows = allTransactions.length > 0 
        ? allTransactions.map((t, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#faf5ff' : '#ffffff'};">
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date(t.date).toLocaleDateString('fr-FR')}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; ${t.type === 'apport' ? 'background: #dcfce7; color: #166534;' : 'background: #fee2e2; color: #991b1b;'}">
                  ${t.type === 'apport' ? `${EMOJI.entree} Apport` : `${EMOJI.sortie} Sortie`}
                </span>
              </td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${t.description}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; ${t.type === 'apport' ? 'color: #166534;' : 'color: #991b1b;'}">
                ${t.type === 'apport' ? '+' : '-'}${t.montant.toLocaleString('fr-FR')} FCFA
              </td>
            </tr>
          `).join('')
        : `<tr><td colspan="4" style="padding: 20px; text-align: center; color: #9ca3af;">Aucune transaction enregistrée</td></tr>`;

      return `
        <div class="driver-card">
          <div class="driver-header">
            <div class="driver-info">
              <h2>${EMOJI.personne} ${driver.prenom} ${driver.nom}</h2>
              <div class="driver-details">
                <span>${EMOJI.telephone} ${driver.telephone}</span>
                ${driver.cni ? `<span>${EMOJI.cni} ${driver.cni}</span>` : ''}
                <span class="status ${onMission ? 'on-mission' : 'available'}">${onMission ? `${EMOJI.camion} En mission` : `${EMOJI.succes} Disponible`}</span>
              </div>
            </div>
          </div>
          
          <div class="stats-grid">
            <div class="stat-box green">
              <div class="stat-label">${EMOJI.entree} Total Apports</div>
              <div class="stat-value">+${apports.toLocaleString('fr-FR')} FCFA</div>
            </div>
            <div class="stat-box red">
              <div class="stat-label">${EMOJI.sortie} Total Sorties</div>
              <div class="stat-value">-${sorties.toLocaleString('fr-FR')} FCFA</div>
            </div>
            <div class="stat-box ${balance >= 0 ? 'green' : 'red'}">
              <div class="stat-label">${EMOJI.argent} Solde Net</div>
              <div class="stat-value">${balance >= 0 ? '+' : ''}${balance.toLocaleString('fr-FR')} FCFA</div>
            </div>
            <div class="stat-box purple">
              <div class="stat-label">${EMOJI.camion} Trajets effectués</div>
              <div class="stat-value">${tripsCount}</div>
            </div>
          </div>

          <div class="transactions-section">
            <h3>${EMOJI.liste} Historique des opérations (${allTransactions.length})</h3>
            <table class="transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th style="text-align: right;">Montant</th>
                </tr>
              </thead>
              <tbody>
                ${transactionsRows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');

    const totalDrivers = filteredDrivers.length;
    const totalApports = filteredDrivers.reduce((sum, d) => sum + getDriverStats(d).apports, 0);
    const totalSorties = filteredDrivers.reduce((sum, d) => sum + getDriverStats(d).sorties, 0);
    const totalBalance = totalApports - totalSorties;
    const totalTransactions = filteredDrivers.reduce((sum, d) => sum + getDriverStats(d).allTransactions.length, 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <title>Rapport Détaillé des Chauffeurs</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              padding: 24px;
              color: #111827;
              background: #fff;
            }
            .header {
              border-bottom: 3px solid #7c3aed;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            h1 {
              font-size: 24px;
              color: #7c3aed;
              margin-bottom: 8px;
            }
            .date { font-size: 12px; color: #6b7280; }
            
            .summary-section {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              margin-bottom: 32px;
              padding: 20px;
              background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
              border-radius: 12px;
              border: 1px solid #c4b5fd;
            }
            .summary-box {
              text-align: center;
              padding: 12px;
            }
            .summary-value {
              font-size: 24px;
              font-weight: 700;
              color: #7c3aed;
            }
            .summary-label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              margin-top: 4px;
            }
            
            .driver-card {
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              margin-bottom: 24px;
              overflow: hidden;
              page-break-inside: avoid;
            }
            .driver-header {
              background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
              padding: 16px 20px;
              color: white;
            }
            .driver-header h2 {
              font-size: 18px;
              margin-bottom: 8px;
            }
            .driver-details {
              display: flex;
              gap: 16px;
              font-size: 13px;
              flex-wrap: wrap;
            }
            .driver-details .status {
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
            }
            .status.on-mission { background: #fef3c7; color: #92400e; }
            .status.available { background: #dcfce7; color: #166534; }
            
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              padding: 16px;
              background: #faf5ff;
            }
            .stat-box {
              padding: 12px;
              border-radius: 8px;
              text-align: center;
            }
            .stat-box.green { background: #dcfce7; border: 1px solid #86efac; }
            .stat-box.red { background: #fee2e2; border: 1px solid #fca5a5; }
            .stat-box.purple { background: #f3e8ff; border: 1px solid #d8b4fe; }
            .stat-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
            .stat-value { font-size: 16px; font-weight: 700; }
            .stat-box.green .stat-value { color: #166534; }
            .stat-box.red .stat-value { color: #991b1b; }
            .stat-box.purple .stat-value { color: #7c3aed; }
            
            .transactions-section {
              padding: 16px;
            }
            .transactions-section h3 {
              font-size: 14px;
              color: #374151;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e5e7eb;
            }
            .transactions-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            .transactions-table thead {
              background: #f3e8ff;
            }
            .transactions-table th {
              padding: 10px 8px;
              text-align: left;
              font-weight: 600;
              color: #7c3aed;
              font-size: 11px;
              text-transform: uppercase;
            }
            .transactions-table td {
              padding: 8px;
            }
            
            .footer {
              margin-top: 32px;
              padding-top: 16px;
              border-top: 1px solid #e5e7eb;
              font-size: 11px;
              color: #9ca3af;
              text-align: center;
            }
            
            @media print {
              body { padding: 0; }
              .driver-card { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 Rapport Détaillé des Chauffeurs</h1>
            <p class="date">Généré le ${currentDate}</p>
          </div>
          
          <div class="summary-section">
            <div class="summary-box">
              <div class="summary-value">${totalDrivers}</div>
              <div class="summary-label">Chauffeurs</div>
            </div>
            <div class="summary-box">
              <div class="summary-value">${totalTransactions}</div>
              <div class="summary-label">Opérations</div>
            </div>
            <div class="summary-box">
              <div class="summary-value" style="color: #166534;">+${totalApports.toLocaleString('fr-FR')}</div>
              <div class="summary-label">Total Apports (FCFA)</div>
            </div>
            <div class="summary-box">
              <div class="summary-value" style="color: ${totalBalance >= 0 ? '#166534' : '#991b1b'};">${totalBalance >= 0 ? '+' : ''}${totalBalance.toLocaleString('fr-FR')}</div>
              <div class="summary-label">Solde Global (FCFA)</div>
            </div>
          </div>

          ${driversContent}
          
          <div class="footer">
            Document généré automatiquement par TruckTrack • ${currentDate}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  return (
    <div className="space-y-6 p-1">
      {/* En-tête professionnel */}
      <PageHeader
        title="Gestion des Chauffeurs"
        description="Gérez vos chauffeurs et leur situation financière"
        icon={Users}
        gradient="from-purple-500/20 via-pink-500/10 to-transparent"
        stats={[
          {
            label: 'Total',
            value: drivers.length,
            icon: <Users className="h-4 w-4" />,
            color: 'text-blue-600 dark:text-blue-400'
          },
          {
            label: 'En mission',
            value: driversOnMission,
            icon: <UserCheck className="h-4 w-4" />,
            color: 'text-green-600 dark:text-green-400'
          },
          {
            label: 'Solde +',
            value: positiveBalance,
            icon: <TrendingUp className="h-4 w-4" />,
            color: 'text-emerald-600 dark:text-emerald-400'
          },
          {
            label: 'Solde Total',
            value: `${totalBalance.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA`,
            icon: <DollarSign className="h-4 w-4" />,
            color: totalBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
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
            <Button variant="outline" onClick={handleExportDetailedPDF} className="shadow-md hover:shadow-lg transition-all duration-300 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-950/50">
              <FileText className="mr-2 h-4 w-4" />
              PDF Détaillé
            </Button>
            {canCreate && (
              <Button onClick={() => { resetDriverForm(); setIsAddDriverDialogOpen(true); }} className="shadow-md hover:shadow-lg transition-all duration-300">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un chauffeur
              </Button>
            )}
            {/* Dialog partagé : création et modification */}
            {(canCreate || canModifyNonFinancial) && (
            <Dialog open={isAddDriverDialogOpen} onOpenChange={(open) => {
              setIsAddDriverDialogOpen(open);
              if (!open) resetDriverForm();
            }}>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingDriver ? 'Modifier le chauffeur' : 'Ajouter un chauffeur'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddDriver} className="space-y-4">
                  <div>
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input
                      id="prenom"
                      value={driverForm.prenom}
                      onChange={(e) => setDriverForm({ ...driverForm, prenom: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="nom">Nom</Label>
                    <Input
                      id="nom"
                      value={driverForm.nom}
                      onChange={(e) => setDriverForm({ ...driverForm, nom: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input
                      id="telephone"
                      value={driverForm.telephone}
                      onChange={(e) => setDriverForm({ ...driverForm, telephone: e.target.value })}
                      placeholder="+237 6 12 34 56 78"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cni">Numéro de CNI</Label>
                    <Input
                      id="cni"
                      value={driverForm.cni}
                      onChange={(e) => setDriverForm({ ...driverForm, cni: e.target.value })}
                      placeholder="CE-123456789"
                    />
                  </div>
                  <div>
                    <Label htmlFor="photo">Photo du chauffeur</Label>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="cursor-pointer"
                    />
                    {photoPreview && (
                      <div className="mt-3">
                        <img
                          src={photoPreview}
                          alt="Aperçu"
                          className="w-32 h-32 rounded-full object-cover border-2 border-primary"
                        />
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="w-full">
                    {editingDriver ? 'Enregistrer les modifications' : 'Ajouter'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </div>
        }
      />

      {/* Section de filtres */}
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-br from-background to-muted/20 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres de recherche
            </CardTitle>
            {(searchTerm || filterStatus !== 'all' || filterSolde !== 'all' || filterMinTrips || filterMaxTrips) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterSolde('all');
                  setFilterMinTrips('');
                  setFilterMaxTrips('');
                }}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Recherche générale */}
            <div>
              <Label htmlFor="search-drivers" className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Recherche générale
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-drivers"
                  placeholder="Rechercher par nom, prénom, téléphone ou CNI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtres actifs */}
            {(filterStatus !== 'all' || filterSolde !== 'all' || filterMinTrips || filterMaxTrips) && (
              <div className="flex flex-wrap gap-2 pb-2">
                {filterStatus !== 'all' && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                    {filterStatus === 'en_mission' ? 'En mission' : 'Disponible'}
                    <button
                      onClick={() => setFilterStatus('all')}
                      className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filterSolde !== 'all' && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                    Solde: {filterSolde === 'positif' ? 'Positif' : filterSolde === 'negatif' ? 'Négatif' : 'Zéro'}
                    <button
                      onClick={() => setFilterSolde('all')}
                      className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filterMinTrips && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                    Min trajets: {filterMinTrips}
                    <button
                      onClick={() => setFilterMinTrips('')}
                      className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filterMaxTrips && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                    Max trajets: {filterMaxTrips}
                    <button
                      onClick={() => setFilterMaxTrips('')}
                      className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}

            {/* Sélecteurs de filtres */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-2">Statut</Label>
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as 'all' | 'en_mission' | 'disponible')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="disponible">Disponible</SelectItem>
                    <SelectItem value="en_mission">En mission</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-2">Solde</Label>
                <Select value={filterSolde} onValueChange={(value) => setFilterSolde(value as 'all' | 'positif' | 'negatif' | 'zero')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les soldes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les soldes</SelectItem>
                    <SelectItem value="positif">Solde positif</SelectItem>
                    <SelectItem value="negatif">Solde négatif</SelectItem>
                    <SelectItem value="zero">Solde zéro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-2">Nombre min de trajets</Label>
                <Input
                  type="number"
                  min="0"
                  value={filterMinTrips}
                  onChange={(e) => setFilterMinTrips(e.target.value)}
                  placeholder="Min"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-2">Nombre max de trajets</Label>
                <Input
                  type="number"
                  min="0"
                  value={filterMaxTrips}
                  onChange={(e) => setFilterMaxTrips(e.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDrivers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm ? 'Aucun chauffeur ne correspond à votre recherche' : 'Aucun chauffeur enregistré'}
            </p>
          </div>
        ) : (
          filteredDrivers.map((driver) => {
          const stats = getDriverStats(driver);
          const { balance, apports, sorties, allTransactions } = stats;
          const tripsCount = trips.filter(t => t.chauffeurId === driver.id).length;

          return (
            <Card key={driver.id} className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30 group">
              <CardHeader className="bg-gradient-to-br from-background to-muted/20 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {driver.photo && (
                      <div className="relative">
                        <img 
                          src={driver.photo} 
                          alt={`${driver.prenom} ${driver.nom}`}
                          className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{driver.prenom} {driver.nom}</CardTitle>
                        {isDriverOnMission(driver.id, trips) && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
                            Indisponible
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        {EMOJI.telephone} {driver.telephone}
                      </p>
                      {driver.cni && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          🪪 CNI: {driver.cni}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                          <Route className="h-3 w-3 mr-1" />
                          {tripsCount} trajet{tripsCount > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {canModifyNonFinancial && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditDriver(driver)}
                        title="Modifier le chauffeur"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDeleteNonFinancial && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteDriver(driver.id)}
                        title="Supprimer le chauffeur"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200 dark:border-green-900">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-400">Apports</span>
                      </div>
                      <p className="text-lg font-bold text-green-700 dark:text-green-400">{apports.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 border border-red-200 dark:border-red-900">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <span className="text-xs font-medium text-red-700 dark:text-red-400">Sorties</span>
                      </div>
                      <p className="text-lg font-bold text-red-700 dark:text-red-400">{sorties.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-3 border border-primary/20">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">Solde net:</span>
                      <Badge 
                        variant={balance >= 0 ? 'default' : 'destructive'} 
                        className="text-base px-4 py-1.5 shadow-sm"
                      >
                        {balance.toLocaleString('fr-FR')} FCFA
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-muted-foreground">{EMOJI.liste} Transactions</p>
                    </div>
                    {allTransactions.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {allTransactions.map(transaction => (
                          <div 
                            key={transaction.id} 
                            className="flex justify-between items-center p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
                          >
                            <div className="flex-1 pr-2 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">
                                {transaction.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transaction.date).toLocaleDateString('fr-FR')}
                                {transaction.source !== 'manuel' && (
                                  <span className="ml-1 text-[10px] opacity-75">
                                    ({transaction.source === 'trajet' ? 'Trajet' : 'Dépense'})
                                  </span>
                                )}
                              </p>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap ${
                              transaction.type === 'apport' 
                                ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' 
                                : 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                            }`}>
                              {transaction.type === 'apport' ? '↗' : '↙'} {transaction.montant.toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Aucune transaction enregistrée
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
          })
        )}
      </div>

    </div>
  );
}
