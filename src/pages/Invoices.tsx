import { useMemo, useState } from 'react';
import { useApp, Invoice, InvoiceStatus, Trip } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Plus, CheckCircle2, Clock, Eye, FileText, Download, Mail, Printer, Trash2, DollarSign, AlertCircle, Filter, X, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getAvailableTripsForInvoicing, generateInvoiceNumber as genInvoiceNum } from '@/lib/sync-utils';
import PageHeader from '@/components/PageHeader';
import { exportToExcel, exportToPrintablePDF } from '@/lib/export-utils';

export default function Invoices() {
  const navigate = useNavigate();
  const { invoices, setInvoices, trips, trucks, drivers, expenses, thirdParties } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExpenseInvoiceDialogOpen, setIsExpenseInvoiceDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [selectedExpenseId, setSelectedExpenseId] = useState('');
  const [modePaiement, setModePaiement] = useState('');
  const [notes, setNotes] = useState('');
  const [tva, setTva] = useState<number>(0);
  const [tps, setTps] = useState<number>(0);
  const [remise, setRemise] = useState<number>(0); // Remise en pourcentage
  const [expenseTva, setExpenseTva] = useState<number>(0);
  const [expenseTps, setExpenseTps] = useState<number>(0);
  const [expenseRemise, setExpenseRemise] = useState<number>(0);

  // États pour les filtres
  const [filters, setFilters] = useState({
    searchTerm: '', // Nom du client ou numéro de facture
    type: '', // Type de facture: 'expense' ou 'trip'
    tripId: '',
    driverId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  // Utiliser la fonction centralisée pour obtenir les trajets disponibles
  const availableTrips = getAvailableTripsForInvoicing(trips, invoices);
  
  // Obtenir les dépenses disponibles pour facturation (sans facture existante)
  const availableExpenses = useMemo(() => {
    const invoicedExpenseIds = new Set(invoices.map(inv => inv.expenseId).filter((id): id is string => !!id));
    return expenses.filter(expense => !invoicedExpenseIds.has(expense.id));
  }, [expenses, invoices]);

  const generateInvoiceNumber = () => {
    return genInvoiceNum(invoices);
  };

  // Calculer le prochain numéro de facture qui sera généré
  const nextInvoiceNumber = useMemo(() => {
    return genInvoiceNum(invoices);
  }, [invoices]);

  const handleCreateInvoice = () => {
    if (!selectedTripId) {
      toast.error('Veuillez sélectionner un trajet');
      return;
    }

    const trip = trips.find(t => t.id === selectedTripId);
    if (!trip) return;

    // Calculer les montants avec remise, TVA et TPS
    const montantHTInitial = trip.recette;
    const montantRemise = montantHTInitial * (remise / 100);
    const montantHTApresRemise = montantHTInitial - montantRemise;
    const montantTVA = montantHTApresRemise * (tva / 100);
    const montantTPS = montantHTApresRemise * (tps / 100);
    const montantTTC = montantHTApresRemise + montantTVA + montantTPS;

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      numero: generateInvoiceNumber(),
      trajetId: selectedTripId,
      statut: 'en_attente',
      montantHT: montantHTInitial,
      remise: remise > 0 ? remise : undefined,
      montantHTApresRemise: remise > 0 ? montantHTApresRemise : undefined,
      tva: tva > 0 ? montantTVA : undefined,
      tps: tps > 0 ? montantTPS : undefined,
      montantTTC: montantTTC,
      montantPaye: 0,
      dateCreation: new Date().toISOString().split('T')[0],
      modePaiement: modePaiement || undefined,
      notes: notes || undefined,
    };

    setInvoices([...invoices, newInvoice]);
    toast.success(`Facture ${newInvoice.numero} créée avec succès${newInvoice.notes ? ` - Note: ${newInvoice.notes}` : ''}`);
    setIsDialogOpen(false);
    setSelectedTripId('');
    setModePaiement('');
    setNotes('');
    setTva(0);
    setTps(0);
    setRemise(0);
  };

  const handleCreateExpenseInvoice = () => {
    if (!selectedExpenseId) {
      toast.error('Veuillez sélectionner une dépense');
      return;
    }

    const expense = expenses.find(e => e.id === selectedExpenseId);
    if (!expense) return;

    // Calculer les montants avec remise, TVA et TPS
    const montantHTInitial = expense.montant;
    const montantRemise = montantHTInitial * (expenseRemise / 100);
    const montantHTApresRemise = montantHTInitial - montantRemise;
    const montantTVA = montantHTApresRemise * (expenseTva / 100);
    const montantTPS = montantHTApresRemise * (expenseTps / 100);
    const montantTTC = montantHTApresRemise + montantTVA + montantTPS;

    // Générer un numéro de facture pour dépense
    const year = new Date().getFullYear();
    const invoiceCount = invoices.filter(inv => inv.numero.startsWith(`FAC-EXP-${year}`)).length + 1;
    const numero = `FAC-EXP-${year}-${String(invoiceCount).padStart(3, '0')}`;

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      numero,
      expenseId: selectedExpenseId,
      statut: 'en_attente',
      montantHT: montantHTInitial,
      remise: expenseRemise > 0 ? expenseRemise : undefined,
      montantHTApresRemise: expenseRemise > 0 ? montantHTApresRemise : undefined,
      tva: expenseTva > 0 ? montantTVA : undefined,
      tps: expenseTps > 0 ? montantTPS : undefined,
      montantTTC: montantTTC,
      montantPaye: 0,
      dateCreation: new Date().toISOString().split('T')[0],
      modePaiement: modePaiement || undefined,
      notes: notes || undefined,
    };

    setInvoices([...invoices, newInvoice]);
    toast.success(`Facture de dépense ${newInvoice.numero} créée avec succès${newInvoice.notes ? ` - Note: ${newInvoice.notes}` : ''}`);
    setIsExpenseInvoiceDialogOpen(false);
    setSelectedExpenseId('');
    setModePaiement('');
    setNotes('');
    setExpenseTva(0);
    setExpenseTps(0);
    setExpenseRemise(0);
  };

  const handleMarkPaid = (id: string) => {
    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice) return;
    
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.montantPaye || invoice.montantTTC); // Pré-remplir avec le montant déjà payé ou le montant TTC
    setIsPaymentDialogOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedInvoice) return;

    if (paymentAmount < 0) {
      toast.error('Le montant payé ne peut pas être négatif');
      return;
    }

    if (paymentAmount > selectedInvoice.montantTTC) {
      toast.error('Le montant payé ne peut pas dépasser le montant TTC');
      return;
    }

    const updatedInvoice: Invoice = {
      ...selectedInvoice,
      montantPaye: paymentAmount,
      statut: paymentAmount >= selectedInvoice.montantTTC ? 'payee' as InvoiceStatus : 'en_attente',
      datePaiement: paymentAmount > 0 ? (selectedInvoice.datePaiement || new Date().toISOString().split('T')[0]) : undefined,
      modePaiement: selectedInvoice.modePaiement || undefined,
    };

    const updatedInvoices = invoices.map(inv => 
      inv.id === selectedInvoice.id ? updatedInvoice : inv
    );

    setInvoices(updatedInvoices);

    // Synchroniser avec le trajet si c'est une facture de trajet
    if (selectedInvoice.trajetId) {
      const { syncInvoicePaymentWithTrip } = require('@/lib/sync-utils');
      syncInvoicePaymentWithTrip(updatedInvoice, trips, setTrips, updatedInvoices);
    }

    if (paymentAmount >= selectedInvoice.montantTTC) {
      toast.success('Facture marquée comme payée complètement');
    } else if (paymentAmount > 0) {
      toast.success(`Paiement partiel enregistré: ${paymentAmount.toLocaleString('fr-FR')} FCFA sur ${selectedInvoice.montantTTC.toLocaleString('fr-FR')} FCFA`);
    }

    setIsPaymentDialogOpen(false);
    setSelectedInvoice(null);
    setPaymentAmount(0);
  };

  const handleDeleteInvoice = (id: string) => {
    const invoice = invoices.find(inv => inv.id === id);
    if (invoice && confirm(`Êtes-vous sûr de vouloir supprimer la facture ${invoice.numero} ?`)) {
      setInvoices(invoices.filter(inv => inv.id !== id));
      toast.success('Facture supprimée - Le trajet peut maintenant être modifié ou refacturé');
    }
  };

  const getTripLabel = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return 'N/A';
    return `${trip.origine} → ${trip.destination}`;
  };

  const getTrip = (tripId: string): Trip | undefined => {
    return trips.find(t => t.id === tripId);
  };

  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.prenom} ${driver.nom}` : 'N/A';
  };

  const getTruckLabel = (truckId: string) => {
    const truck = trucks.find(t => t.id === truckId);
    return truck ? truck.immatriculation : 'N/A';
  };

  // Fonction pour obtenir une dépense
  const getExpense = (expenseId?: string) => {
    if (!expenseId) return undefined;
    return expenses.find(e => e.id === expenseId);
  };

  // Fonction pour filtrer les factures
  const filteredInvoices = useMemo(
    () =>
      invoices.filter(invoice => {
        const trip = getTrip(invoice.trajetId);
        const expense = getExpense(invoice.expenseId);

        // Filtre par type de facture
        if (filters.type) {
          if (filters.type === 'expense' && !invoice.expenseId) return false;
          if (filters.type === 'trip' && !invoice.trajetId) return false;
        }

        // Filtre par recherche (nom client, numéro de facture, description de dépense)
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          const matchesClient = trip?.client?.toLowerCase().includes(searchLower);
          const matchesNumber = invoice.numero.toLowerCase().includes(searchLower);
          const matchesExpense = expense?.description?.toLowerCase().includes(searchLower) || 
                                 expense?.categorie?.toLowerCase().includes(searchLower);
          if (!matchesClient && !matchesNumber && !matchesExpense) return false;
        }

        // Filtre par trajet (seulement pour les factures de trajets)
        if (filters.tripId) {
          if (invoice.trajetId !== filters.tripId) return false;
        }

        // Filtre par chauffeur (pour trajets et dépenses)
        if (filters.driverId) {
          const driverMatch = trip?.chauffeurId === filters.driverId || 
                             expense?.chauffeurId === filters.driverId;
          if (!driverMatch) return false;
        }

        // Filtre par statut
        if (filters.status && invoice.statut !== filters.status) {
          return false;
        }

        // Filtre par date de création (du)
        if (filters.dateFrom && invoice.dateCreation < filters.dateFrom) {
          return false;
        }

        // Filtre par date de création (au)
        if (filters.dateTo && invoice.dateCreation > filters.dateTo) {
          return false;
        }

        return true;
      }),
    [invoices, filters, trips, expenses],
  );

  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      type: '',
      tripId: '',
      driverId: '',
      status: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  // Vérifier si des filtres sont actifs
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => value !== '');

  const filtersDescription = useMemo(() => {
    const parts: string[] = [];
    if (filters.searchTerm) parts.push(`Recherche: "${filters.searchTerm}"`);
    if (filters.type) {
      parts.push(`Type: ${filters.type === 'expense' ? 'Dépense' : 'Trajet'}`);
    }
    if (filters.tripId) parts.push(`Trajet filtré`);
    if (filters.driverId) parts.push(`Chauffeur filtré`);
    if (filters.status) {
      parts.push(
        `Statut: ${filters.status === 'en_attente' ? 'En attente' : 'Payée'}`,
      );
    }
    if (filters.dateFrom) {
      parts.push(`Date du: ${new Date(filters.dateFrom).toLocaleDateString('fr-FR')}`);
    }
    if (filters.dateTo) {
      parts.push(`Date au: ${new Date(filters.dateTo).toLocaleDateString('fr-FR')}`);
    }
    return parts.join(' | ');
  }, [filters]);

  const handleExportInvoicesExcel = () => {
    if (filteredInvoices.length === 0) return;

    exportToExcel({
      title: 'Factures filtrées',
      fileName: 'factures_filtrées.xlsx',
      sheetName: 'Factures',
      filtersDescription,
      columns: [
        { header: 'Numéro', value: (inv) => inv.numero },
        {
          header: 'Type',
          value: (inv) => inv.expenseId ? 'Dépense' : 'Trajet',
        },
        {
          header: 'Détails',
          value: (inv) => {
            if (inv.expenseId) {
              const expense = getExpense(inv.expenseId);
              return expense ? expense.description : '';
            } else {
              return getTripLabel(inv.trajetId);
            }
          },
        },
        {
          header: 'Client/Fournisseur',
          value: (inv) => {
            if (inv.expenseId) {
              const expense = getExpense(inv.expenseId);
              const supplier = expense?.fournisseurId ? thirdParties.find(tp => tp.id === expense.fournisseurId) : null;
              return supplier?.nom || '';
            } else {
              const trip = getTrip(inv.trajetId);
              return trip?.client || '';
            }
          },
        },
        {
          header: 'Catégorie/Marchandise',
          value: (inv) => {
            if (inv.expenseId) {
              const expense = getExpense(inv.expenseId);
              return expense ? `${expense.categorie}${expense.sousCategorie ? ' - ' + expense.sousCategorie : ''}` : '';
            } else {
              const trip = getTrip(inv.trajetId);
              return trip?.marchandise || '';
            }
          },
        },
        {
          header: 'Date création',
          value: (inv) => inv.dateCreation,
        },
        {
          header: 'Montant TTC',
          value: (inv) => inv.montantTTC,
        },
        {
          header: 'Statut',
          value: (inv) => inv.statut,
        },
      ],
      rows: filteredInvoices,
    });
  };

  const handleExportInvoicesPDF = () => {
    if (filteredInvoices.length === 0) return;

    exportToPrintablePDF({
      title: 'Liste des factures',
      fileName: 'factures.pdf',
      filtersDescription,
      columns: [
        { header: 'Numéro', value: (inv) => inv.numero },
        {
          header: 'Type',
          value: (inv) => inv.expenseId ? 'Dépense' : 'Trajet',
        },
        {
          header: 'Détails',
          value: (inv) => {
            if (inv.expenseId) {
              const expense = getExpense(inv.expenseId);
              return expense ? expense.description : '';
            } else {
              return getTripLabel(inv.trajetId);
            }
          },
        },
        {
          header: 'Client/Fournisseur',
          value: (inv) => {
            if (inv.expenseId) {
              const expense = getExpense(inv.expenseId);
              const supplier = expense?.fournisseurId ? thirdParties.find(tp => tp.id === expense.fournisseurId) : null;
              return supplier?.nom || '';
            } else {
              const trip = getTrip(inv.trajetId);
              return trip?.client || '';
            }
          },
        },
        {
          header: 'Catégorie/Marchandise',
          value: (inv) => {
            if (inv.expenseId) {
              const expense = getExpense(inv.expenseId);
              return expense ? `${expense.categorie}${expense.sousCategorie ? ' - ' + expense.sousCategorie : ''}` : '';
            } else {
              const trip = getTrip(inv.trajetId);
              return trip?.marchandise || '';
            }
          },
        },
        {
          header: 'Date création',
          value: (inv) =>
            new Date(inv.dateCreation).toLocaleDateString('fr-FR'),
        },
        {
          header: 'Montant TTC',
          value: (inv) => inv.montantTTC.toLocaleString('fr-FR'),
        },
        {
          header: 'Statut',
          value: (inv) => (inv.statut === 'payee' ? 'Payée' : 'En attente'),
        },
      ],
      rows: filteredInvoices,
    });
  };

  // Calcul des statistiques (basées sur les factures filtrées)
  const totalFactures = filteredInvoices.length;
  const facturesPayees = filteredInvoices.filter(inv => inv.statut === 'payee').length;
  const facturesEnAttente = filteredInvoices.filter(inv => inv.statut === 'en_attente').length;
  const montantTotal = filteredInvoices.reduce((sum, inv) => sum + inv.montantHT, 0);
  // Calculer le montant en attente en tenant compte des paiements partiels
  const montantEnAttente = filteredInvoices.reduce((sum, inv) => {
    const montantPaye = inv.montantPaye || 0;
    const montantRestant = inv.montantTTC - montantPaye;
    return sum + Math.max(0, montantRestant); // S'assurer que le montant restant n'est pas négatif
  }, 0);

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!selectedInvoice) return;

    try {
      // Créer un élément HTML pour le PDF
      const pdfContent = document.createElement('div');
      pdfContent.className = 'invoice-print p-8 bg-white text-black';
      pdfContent.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
          <!-- En-tête -->
          <div class="mb-8 border-b-2 border-gray-300 pb-4">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h1 class="text-3xl font-bold mb-2">FACTURE</h1>
                <p class="text-sm text-gray-600">N° ${selectedInvoice.numero}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-600 mb-2">Date: ${new Date(selectedInvoice.dateCreation).toLocaleDateString('fr-FR')}</p>
                <span class="px-3 py-1 bg-${selectedInvoice.statut === 'payee' ? 'green' : 'yellow'}-100 text-${selectedInvoice.statut === 'payee' ? 'green' : 'yellow'}-700 rounded">
                  ${selectedInvoice.statut === 'payee' ? 'Payée' : 'En attente'}
                </span>
              </div>
            </div>
          </div>

          <!-- Informations entreprise et client -->
          ${(function() {
            const trip = getTrip(selectedInvoice.trajetId);
            const driver = trip ? drivers.find(d => d.id === trip.chauffeurId) : null;
            return `
              <div class="grid grid-cols-2 gap-8 mb-8 pb-6 border-b border-gray-200">
                <div>
                  <h2 class="font-bold text-lg mb-3 uppercase">Truck Track Cameroun</h2>
                  <p class="text-sm mb-1">Transport de marchandises</p>
                  <p class="text-sm mb-1">Douala, Cameroun</p>
                  <p class="text-sm mb-1">Tél: +237 6 XX XX XX XX</p>
                  <p class="text-sm">Email: contact@trucktrack.cm</p>
                </div>
                <div class="text-right">
                  <h2 class="font-bold text-lg mb-3 uppercase">Client</h2>
                  <p class="font-semibold">${trip?.client || 'N/A'}</p>
                </div>
              </div>

              ${trip ? `
                <!-- Détails du service -->
                <div class="mb-8">
                  <h3 class="font-bold text-lg mb-4 uppercase">Détails du transport</h3>
                  <div class="border rounded-lg overflow-hidden">
                    <table class="w-full">
                      <thead class="bg-gray-100">
                        <tr>
                          <th class="p-3 text-left font-bold text-sm">Description</th>
                          <th class="p-3 text-right font-bold text-sm">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr class="border-t border-gray-200">
                          <td class="p-3">
                            <div>
                              <p class="font-semibold">Transport ${trip.origine} → ${trip.destination}</p>
                              ${driver ? `<p class="text-xs text-gray-600">Chauffeur: ${driver.prenom} ${driver.nom}</p>` : ''}
                              ${trip.marchandise ? `<p class="text-xs text-gray-600">Marchandise: ${trip.marchandise}</p>` : ''}
                              ${trip.description ? `<p class="text-xs text-gray-600">${trip.description}</p>` : ''}
                            </div>
                          </td>
                          <td class="p-3 text-right font-bold">
                            ${selectedInvoice.montantTTC.toLocaleString('fr-FR')} FCFA
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Informations additionnelles -->
                <div class="mb-8 grid grid-cols-2 gap-6">
                  <div>
                    <p class="font-semibold mb-2">Informations:</p>
                    <div class="text-sm space-y-1">
                      ${driver ? `<p class="text-gray-600">Chauffeur: <span class="text-black">${driver.prenom} ${driver.nom}</span></p>` : ''}
                      ${trip.tracteurId ? `<p class="text-gray-600">Tracteur: <span class="text-black">${getTruckLabel(trip.tracteurId)}</span></p>` : ''}
                      ${trip.remorqueuseId ? `<p class="text-gray-600">Remorque: <span class="text-black">${getTruckLabel(trip.remorqueuseId)}</span></p>` : ''}
                      <p class="text-gray-600">Départ: <span class="text-black">${new Date(trip.dateDepart).toLocaleDateString('fr-FR')}</span></p>
                      ${trip.dateArrivee ? `<p class="text-gray-600">Arrivée: <span class="text-black">${new Date(trip.dateArrivee).toLocaleDateString('fr-FR')}</span></p>` : ''}
                    </div>
                  </div>
                  <div>
                    ${selectedInvoice.modePaiement ? `
                      <p class="font-semibold mb-2">Paiement:</p>
                      <p class="text-sm text-gray-600">Mode: <span class="text-black">${selectedInvoice.modePaiement}</span></p>
                    ` : ''}
                  </div>
                </div>
              ` : ''}
            `;
          })()}
          <div class="flex justify-end mb-8">
            <div class="w-64">
              <div class="border-t-2 border-gray-300 pt-4">
                <div class="space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600">Montant HT initial:</span>
                    <span class="font-semibold">${selectedInvoice.montantHT.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  ${selectedInvoice.remise && selectedInvoice.remise > 0 && selectedInvoice.montantHTApresRemise ? `
                    <div class="flex justify-between items-center text-orange-600">
                      <span class="text-gray-600">Remise (${selectedInvoice.remise}%):</span>
                      <span class="font-semibold">-${(selectedInvoice.montantHT - selectedInvoice.montantHTApresRemise).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                    </div>
                    <div class="flex justify-between items-center pt-1 border-t border-gray-200">
                      <span class="text-gray-600">Montant HT après remise:</span>
                      <span class="font-semibold">${selectedInvoice.montantHTApresRemise.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                    </div>
                  ` : ''}
                  ${selectedInvoice.tva && selectedInvoice.tva > 0 ? `
                    <div class="flex justify-between items-center">
                      <span class="text-gray-600">TVA:</span>
                      <span class="font-semibold">${selectedInvoice.tva.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                    </div>
                  ` : ''}
                  ${selectedInvoice.tps && selectedInvoice.tps > 0 ? `
                    <div class="flex justify-between items-center">
                      <span class="text-gray-600">TPS:</span>
                      <span class="font-semibold">${selectedInvoice.tps.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                    </div>
                  ` : ''}
                  <div class="flex justify-between items-center pt-2 border-t border-gray-300">
                    <span class="font-bold text-lg">Montant TTC:</span>
                    <span class="font-bold text-2xl">${selectedInvoice.montantTTC.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          ${selectedInvoice.notes ? `
            <div class="mt-8 border-t border-gray-200 pt-4">
              <p class="font-semibold mb-2">Remarques:</p>
              <p class="text-sm text-gray-600">${selectedInvoice.notes}</p>
            </div>
          ` : ''}

          <!-- Pied de page -->
          <div class="mt-12 pt-8 border-t-2 border-gray-300 text-center">
            <p class="font-bold text-sm">Truck Track Cameroun</p>
            <p class="text-sm text-gray-600 mt-1">Merci pour votre confiance!</p>
          </div>
        </div>
      `;

      // Créer une fenêtre pour le PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Facture ${selectedInvoice.numero}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  padding: 40px; 
                  background: white;
                  color: black;
                }
                .invoice-print { max-width: 800px; margin: 0 auto; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 12px; text-align: left; }
                th { background: #f3f4f6; font-weight: bold; }
                .border-t { border-top: 1px solid #e5e7eb; }
                .border-t-2 { border-top: 2px solid #9ca3af; }
                .border-b { border-bottom: 1px solid #e5e7eb; }
                .border-b-2 { border-bottom: 2px solid #9ca3af; }
                .rounded { border-radius: 0.375rem; }
                .rounded-lg { border-radius: 0.5rem; }
                .bg-gray-100 { background: #f3f4f6; }
                .bg-gray-200 { background: #e5e7eb; }
                .text-gray-600 { color: #4b5563; }
                .text-gray-700 { color: #374151; }
                .text-green-700 { color: #15803d; }
                .text-yellow-700 { color: #a16207; }
                .bg-green-100 { background: #dcfce7; }
                .bg-yellow-100 { background: #fef3c7; }
                .font-bold { font-weight: 700; }
                .font-semibold { font-weight: 600; }
                .text-xs { font-size: 0.75rem; }
                .text-sm { font-size: 0.875rem; }
                .text-lg { font-size: 1.125rem; }
                .text-2xl { font-size: 1.5rem; }
                .text-3xl { font-size: 1.875rem; }
                .uppercase { text-transform: uppercase; }
                .grid { display: grid; }
                .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .gap-6 { gap: 1.5rem; }
                .gap-8 { gap: 2rem; }
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .mb-1 { margin-bottom: 0.25rem; }
                .mb-2 { margin-bottom: 0.5rem; }
                .mb-4 { margin-bottom: 1rem; }
                .mb-8 { margin-bottom: 2rem; }
                .mt-1 { margin-top: 0.25rem; }
                .mt-8 { margin-top: 2rem; }
                .mt-12 { margin-top: 3rem; }
                .p-3 { padding: 0.75rem; }
                .p-8 { padding: 2rem; }
                .pt-4 { padding-top: 1rem; }
                .pt-8 { padding-top: 2rem; }
                .pb-4 { padding-bottom: 1rem; }
                .pb-6 { padding-bottom: 1.5rem; }
                .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
                .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
                .space-y-1 > * + * { margin-top: 0.25rem; }
                .overflow-hidden { overflow: hidden; }
              </style>
            </head>
            <body>
              ${pdfContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        
        // Attendre que le contenu soit chargé puis imprimer/télécharger
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  return (
    <div className="space-y-6 p-1">
      {/* En-tête professionnel */}
      <PageHeader
        title="Gestion des Factures"
        description="Créez, suivez et gérez toutes vos factures clients"
        icon={FileText}
        gradient="from-indigo-500/20 via-blue-500/10 to-transparent"
        stats={[
          {
            label: 'Total',
            value: totalFactures,
            icon: <FileText className="h-4 w-4" />,
            color: 'text-blue-600 dark:text-blue-400'
          },
          {
            label: 'Payées',
            value: facturesPayees,
            icon: <CheckCircle2 className="h-4 w-4" />,
            color: 'text-green-600 dark:text-green-400'
          },
          {
            label: 'En attente',
            value: facturesEnAttente,
            icon: <Clock className="h-4 w-4" />,
            color: 'text-yellow-600 dark:text-yellow-400'
          },
          {
            label: 'Montant Total',
            value: montantTotal.toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
            icon: <DollarSign className="h-4 w-4" />,
            color: 'text-purple-600 dark:text-purple-400'
          }
        ]}
        actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="shadow-sm"
            onClick={() => navigate('/credits')}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Crédits
          </Button>
          <Button
            variant="outline"
            className="shadow-sm"
            onClick={handleExportInvoicesPDF}
          >
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-md hover:shadow-lg transition-all duration-300">
                <Plus className="mr-2 h-4 w-4" />
                Facture Trajet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer une facture professionnelle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Afficher le numéro de facture qui sera généré */}
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Numéro de facture qui sera attribué :</Label>
                      <p className="text-2xl font-bold text-primary mt-1 font-mono">{nextInvoiceNumber}</p>
                    </div>
                    <div className="p-3 bg-primary/20 rounded-lg">
                      <FileText className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="trip">Sélectionner un trajet *</Label>
                  <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un trajet">
                        {selectedTripId && (() => {
                          const selectedTrip = getTrip(selectedTripId);
                          if (!selectedTrip) return selectedTripId;
                          const shortId = selectedTripId.slice(-6);
                          return `[ID: ${shortId}] ${selectedTrip.origine} → ${selectedTrip.destination}`;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableTrips.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          <p className="mb-2">⚠️ Aucun trajet disponible pour facturation</p>
                          <p className="text-xs">
                            Pour créer une facture, le trajet doit :<br/>
                            • Avoir une recette &gt; 0 FCFA<br/>
                            • Ne pas avoir de facture existante
                          </p>
                        </div>
                      ) : (
                        availableTrips.map(trip => {
                          const statusLabels = {
                            planifie: 'Planifié',
                            en_cours: 'En cours',
                            termine: 'Terminé',
                            annule: 'Annulé'
                          };
                          const tripDetails = getTrip(trip.id);
                          const driver = tripDetails ? drivers.find(d => d.id === tripDetails.chauffeurId) : null;
                          // Extraire les 6 derniers caractères de l'ID pour un affichage plus court
                          const shortId = trip.id.slice(-6);
                          const dateDepart = tripDetails ? new Date(tripDetails.dateDepart).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
                          
                          return (
                            <SelectItem key={trip.id} value={trip.id} className="py-2">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">ID: {shortId}</span>
                                  <span className="font-semibold">{trip.origine} → {trip.destination}</span>
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                                  {dateDepart && <span>📅 {dateDepart}</span>}
                                  {driver && <span>👤 {driver.prenom} {driver.nom}</span>}
                                  {tripDetails?.client && <span>🏢 {tripDetails.client}</span>}
                                  <span className="font-semibold text-primary">{trip.recette.toLocaleString('fr-FR')} FCFA</span>
                                  <span>({statusLabels[trip.statut]})</span>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Afficher TOUTES les détails du trajet sélectionné */}
                {selectedTripId && (() => {
                  const selectedTrip = getTrip(selectedTripId);
                  if (!selectedTrip) return null;
                  const driver = drivers.find(d => d.id === selectedTrip.chauffeurId);
                  const tracteur = selectedTrip.tracteurId ? trucks.find(t => t.id === selectedTrip.tracteurId) : null;
                  const remorqueuse = selectedTrip.remorqueuseId ? trucks.find(t => t.id === selectedTrip.remorqueuseId) : null;
                  
                  const getStatusLabel = (statut: string) => {
                    const labels: Record<string, string> = {
                      planifie: 'Planifié',
                      en_cours: 'En cours',
                      termine: 'Terminé',
                      annule: 'Annulé'
                    };
                    return labels[statut] || statut;
                  };

                  const getStatusColor = (statut: string) => {
                    const colors: Record<string, string> = {
                      planifie: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
                      en_cours: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
                      termine: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
                      annule: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                    };
                    return colors[statut] || '';
                  };

                  return (
                    <div className="bg-gradient-to-br from-muted/50 to-muted/30 border-2 border-primary/20 rounded-lg p-5 space-y-4 shadow-md">
                      {/* En-tête avec ID */}
                      <div className="flex items-center justify-between pb-3 border-b border-border">
                        <Label className="text-base font-bold">📋 Informations complètes du trajet</Label>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(selectedTrip.statut)}>
                            {getStatusLabel(selectedTrip.statut)}
                          </Badge>
                          <span className="font-mono text-xs bg-primary/20 text-primary px-3 py-1.5 rounded font-bold border border-primary/30">
                            ID: {selectedTripId}
                          </span>
                        </div>
                      </div>

                      {/* Informations principales */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Itinéraire */}
                        <div className="md:col-span-2 bg-primary/5 rounded-lg p-3 border border-primary/10">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">Itinéraire</span>
                          </div>
                          <p className="text-lg font-bold text-primary">
                            {selectedTrip.origine} → {selectedTrip.destination}
                          </p>
                        </div>

                        {/* Dates */}
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground">📅 Date de départ</span>
                            <p className="text-sm font-medium mt-1">{new Date(selectedTrip.dateDepart).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          </div>
                          {selectedTrip.dateArrivee && (
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground">📅 Date d'arrivée</span>
                              <p className="text-sm font-medium mt-1">{new Date(selectedTrip.dateArrivee).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                          )}
                          {!selectedTrip.dateArrivee && (
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground">📅 Date d'arrivée</span>
                              <p className="text-sm text-muted-foreground italic mt-1">À définir</p>
                            </div>
                          )}
                        </div>

                        {/* Chauffeur */}
                        {driver && (
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground">👤 Chauffeur</span>
                              <p className="text-sm font-medium mt-1">{driver.prenom} {driver.nom}</p>
                              {driver.telephone && (
                                <p className="text-xs text-muted-foreground mt-1">📞 {driver.telephone}</p>
                              )}
                              {driver.cni && (
                                <p className="text-xs text-muted-foreground">🪪 CNI: {driver.cni}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Tracteur */}
                        {tracteur && (
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground">🚛 Tracteur</span>
                              <p className="text-sm font-medium mt-1">{tracteur.immatriculation}</p>
                              <p className="text-xs text-muted-foreground mt-1">Modèle: {tracteur.modele}</p>
                            </div>
                          </div>
                        )}

                        {/* Remorqueuse */}
                        {remorqueuse && (
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground">🚚 Remorqueuse</span>
                              <p className="text-sm font-medium mt-1">{remorqueuse.immatriculation}</p>
                              <p className="text-xs text-muted-foreground mt-1">Modèle: {remorqueuse.modele}</p>
                            </div>
                          </div>
                        )}

                        {/* Client */}
                        {selectedTrip.client && (
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground">🏢 Client</span>
                              <p className="text-sm font-medium mt-1">{selectedTrip.client}</p>
                            </div>
                          </div>
                        )}

                        {/* Marchandise */}
                        {selectedTrip.marchandise && (
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground">📦 Marchandise</span>
                              <p className="text-sm font-medium mt-1">{selectedTrip.marchandise}</p>
                            </div>
                          </div>
                        )}

                        {/* Recette */}
                        <div className="md:col-span-2 bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border-2 border-green-200 dark:border-green-800">
                          <span className="text-xs font-semibold text-green-700 dark:text-green-400">💰 Recette</span>
                          <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">
                            {selectedTrip.recette.toLocaleString('fr-FR')} FCFA
                          </p>
                        </div>

                        {/* Description */}
                        {selectedTrip.description && (
                          <div className="md:col-span-2 space-y-2">
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground">📝 Description</span>
                              <p className="text-sm mt-1 bg-background/50 p-2 rounded border border-border">
                                {selectedTrip.description}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <Label htmlFor="modePaiement">Mode de paiement (optionnel)</Label>
                  <Select value={modePaiement || 'none'} onValueChange={(value) => setModePaiement(value === 'none' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      <SelectItem value="Espèces">Espèces</SelectItem>
                      <SelectItem value="Virement bancaire">Virement bancaire</SelectItem>
                      <SelectItem value="Chèque">Chèque</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Section Remise, TVA et TPS */}
                {selectedTripId && (() => {
                  const selectedTrip = getTrip(selectedTripId);
                  if (!selectedTrip) return null;
                  
                  const montantHTInitial = selectedTrip.recette;
                  const montantRemise = montantHTInitial * (remise / 100);
                  const montantHTApresRemise = montantHTInitial - montantRemise;
                  const montantTVA = montantHTApresRemise * (tva / 100);
                  const montantTPS = montantHTApresRemise * (tps / 100);
                  const montantTTC = montantHTApresRemise + montantTVA + montantTPS;

                  return (
                    <div className="space-y-4 border-t pt-4">
                      {/* Remise */}
                      <div>
                        <Label className="text-base font-semibold mb-3 block">Remise (optionnel)</Label>
                        <div>
                          <Label htmlFor="remise">Remise (%)</Label>
                          <NumberInput
                            id="remise"
                            value={remise}
                            onChange={(value) => setRemise(value || 0)}
                            min={0}
                            max={100}
                            step={0.1}
                            placeholder="0"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Ex: 10 pour 10% de remise</p>
                        </div>
                      </div>

                      {/* TVA et TPS */}
                      <div>
                        <Label className="text-base font-semibold mb-3 block">Taux et taxes</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="tva">TVA (%)</Label>
                            <NumberInput
                              id="tva"
                              value={tva}
                              onChange={(value) => setTva(value || 0)}
                              min={0}
                              max={100}
                              step={0.1}
                              placeholder="0"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Ex: 19.25 pour 19.25%</p>
                          </div>
                          <div>
                            <Label htmlFor="tps">TPS (%)</Label>
                            <NumberInput
                              id="tps"
                              value={tps}
                              onChange={(value) => setTps(value || 0)}
                              min={0}
                              max={100}
                              step={0.1}
                              placeholder="0"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Ex: 5 pour 5%</p>
                          </div>
                        </div>
                      </div>

                      {/* Aperçu du calcul */}
                      <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
                        <Label className="text-sm font-semibold">Aperçu du calcul :</Label>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Montant HT initial :</span>
                            <span className="font-medium">{montantHTInitial.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                          {remise > 0 && (
                            <>
                              <div className="flex justify-between text-orange-600 dark:text-orange-400">
                                <span>Remise ({remise}%) :</span>
                                <span className="font-medium">-{montantRemise.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-border">
                                <span className="text-muted-foreground">Montant HT après remise :</span>
                                <span className="font-semibold">{montantHTApresRemise.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                              </div>
                            </>
                          )}
                          {tva > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">TVA ({tva}%) :</span>
                              <span className="font-medium">{montantTVA.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                            </div>
                          )}
                          {tps > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">TPS ({tps}%) :</span>
                              <span className="font-medium">{montantTPS.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-border font-bold text-lg">
                            <span>Montant TTC :</span>
                            <span className="text-primary">{montantTTC.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <Label htmlFor="notes">Notes (optionnel)</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Remarques ou commentaires"
                  />
                </div>

                <Button onClick={handleCreateInvoice} className="w-full">Créer la facture</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isExpenseInvoiceDialogOpen} onOpenChange={setIsExpenseInvoiceDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="shadow-md hover:shadow-lg transition-all duration-300">
                <Plus className="mr-2 h-4 w-4" />
                Facture Dépense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer une facture de dépense</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Afficher le numéro de facture qui sera généré */}
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Numéro de facture qui sera attribué :</Label>
                      <p className="text-2xl font-bold text-primary mt-1 font-mono">
                        {(() => {
                          const year = new Date().getFullYear();
                          const invoiceCount = invoices.filter(inv => inv.numero.startsWith(`FAC-EXP-${year}`)).length + 1;
                          return `FAC-EXP-${year}-${String(invoiceCount).padStart(3, '0')}`;
                        })()}
                      </p>
                    </div>
                    <div className="p-3 bg-primary/20 rounded-lg">
                      <FileText className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="expense">Sélectionner une dépense *</Label>
                  <Select value={selectedExpenseId} onValueChange={setSelectedExpenseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une dépense" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableExpenses.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          <p className="mb-2">⚠️ Aucune dépense disponible pour facturation</p>
                          <p className="text-xs">
                            Toutes les dépenses ont déjà une facture associée
                          </p>
                        </div>
                      ) : (
                        availableExpenses.map(expense => {
                          const truck = trucks.find(t => t.id === expense.camionId);
                          const supplier = expense.fournisseurId ? thirdParties.find(tp => tp.id === expense.fournisseurId) : null;
                          return (
                            <SelectItem key={expense.id} value={expense.id}>
                              <div className="flex flex-col gap-1 py-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{expense.categorie}</span>
                                  {expense.sousCategorie && <span className="text-xs text-muted-foreground">- {expense.sousCategorie}</span>}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                                  {truck && <span>🚛 {truck.immatriculation}</span>}
                                  {supplier && <span>🏢 {supplier.nom}</span>}
                                  <span className="font-semibold text-primary">{expense.montant.toLocaleString('fr-FR')} FCFA</span>
                                  <span>📅 {new Date(expense.date).toLocaleDateString('fr-FR')}</span>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Afficher les détails de la dépense sélectionnée */}
                {selectedExpenseId && (() => {
                  const selectedExpense = expenses.find(e => e.id === selectedExpenseId);
                  if (!selectedExpense) return null;
                  const truck = trucks.find(t => t.id === selectedExpense.camionId);
                  const driver = selectedExpense.chauffeurId ? drivers.find(d => d.id === selectedExpense.chauffeurId) : null;
                  const supplier = selectedExpense.fournisseurId ? thirdParties.find(tp => tp.id === selectedExpense.fournisseurId) : null;
                  const trip = selectedExpense.tripId ? trips.find(t => t.id === selectedExpense.tripId) : null;

                  return (
                    <div className="bg-gradient-to-br from-muted/50 to-muted/30 border-2 border-primary/20 rounded-lg p-5 space-y-4 shadow-md">
                      <div className="flex items-center justify-between pb-3 border-b border-border">
                        <Label className="text-base font-bold">📋 Informations de la dépense</Label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 bg-primary/5 rounded-lg p-3 border border-primary/10">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">Description</span>
                          </div>
                          <p className="text-lg font-bold text-primary">{selectedExpense.description}</p>
                        </div>

                        <div>
                          <span className="text-xs font-semibold text-muted-foreground">📦 Catégorie</span>
                          <p className="text-sm font-medium mt-1">{selectedExpense.categorie}</p>
                          {selectedExpense.sousCategorie && (
                            <p className="text-xs text-muted-foreground">Sous-catégorie: {selectedExpense.sousCategorie}</p>
                          )}
                        </div>

                        <div>
                          <span className="text-xs font-semibold text-muted-foreground">💰 Montant</span>
                          <p className="text-sm font-medium mt-1">{selectedExpense.montant.toLocaleString('fr-FR')} FCFA</p>
                        </div>

                        {truck && (
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground">🚛 Camion</span>
                            <p className="text-sm font-medium mt-1">{truck.immatriculation}</p>
                            <p className="text-xs text-muted-foreground">Modèle: {truck.modele}</p>
                          </div>
                        )}

                        {driver && (
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground">👤 Chauffeur</span>
                            <p className="text-sm font-medium mt-1">{driver.prenom} {driver.nom}</p>
                          </div>
                        )}

                        {supplier && (
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground">🏢 Fournisseur</span>
                            <p className="text-sm font-medium mt-1">{supplier.nom}</p>
                          </div>
                        )}

                        {trip && (
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground">🚚 Trajet lié</span>
                            <p className="text-sm font-medium mt-1">{trip.origine} → {trip.destination}</p>
                          </div>
                        )}

                        <div>
                          <span className="text-xs font-semibold text-muted-foreground">📅 Date</span>
                          <p className="text-sm font-medium mt-1">{new Date(selectedExpense.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <Label htmlFor="modePaiementExpense">Mode de paiement (optionnel)</Label>
                  <Select value={modePaiement || 'none'} onValueChange={(value) => setModePaiement(value === 'none' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      <SelectItem value="Espèces">Espèces</SelectItem>
                      <SelectItem value="Virement bancaire">Virement bancaire</SelectItem>
                      <SelectItem value="Chèque">Chèque</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Section Remise, TVA et TPS pour dépense */}
                {selectedExpenseId && (() => {
                  const selectedExpense = expenses.find(e => e.id === selectedExpenseId);
                  if (!selectedExpense) return null;
                  
                  const montantHTInitial = selectedExpense.montant;
                  const montantRemise = montantHTInitial * (expenseRemise / 100);
                  const montantHTApresRemise = montantHTInitial - montantRemise;
                  const montantTVA = montantHTApresRemise * (expenseTva / 100);
                  const montantTPS = montantHTApresRemise * (expenseTps / 100);
                  const montantTTC = montantHTApresRemise + montantTVA + montantTPS;

                  return (
                    <div className="space-y-4 border-t pt-4">
                      {/* Remise */}
                      <div>
                        <Label className="text-base font-semibold mb-3 block">Remise (optionnel)</Label>
                        <div>
                          <Label htmlFor="expenseRemise">Remise (%)</Label>
                          <NumberInput
                            id="expenseRemise"
                            value={expenseRemise}
                            onChange={(value) => setExpenseRemise(value || 0)}
                            min={0}
                            max={100}
                            step={0.1}
                            placeholder="0"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Ex: 10 pour 10% de remise</p>
                        </div>
                      </div>

                      {/* TVA et TPS */}
                      <div>
                        <Label className="text-base font-semibold mb-3 block">Taux et taxes</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="expenseTva">TVA (%)</Label>
                            <NumberInput
                              id="expenseTva"
                              value={expenseTva}
                              onChange={(value) => setExpenseTva(value || 0)}
                              min={0}
                              max={100}
                              step={0.1}
                              placeholder="0"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Ex: 19.25 pour 19.25%</p>
                          </div>
                          <div>
                            <Label htmlFor="expenseTps">TPS (%)</Label>
                            <NumberInput
                              id="expenseTps"
                              value={expenseTps}
                              onChange={(value) => setExpenseTps(value || 0)}
                              min={0}
                              max={100}
                              step={0.1}
                              placeholder="0"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Ex: 5 pour 5%</p>
                          </div>
                        </div>
                      </div>

                      {/* Aperçu du calcul */}
                      <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
                        <Label className="text-sm font-semibold">Aperçu du calcul :</Label>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Montant HT initial :</span>
                            <span className="font-medium">{montantHTInitial.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                          {expenseRemise > 0 && (
                            <>
                              <div className="flex justify-between text-orange-600 dark:text-orange-400">
                                <span>Remise ({expenseRemise}%) :</span>
                                <span className="font-medium">-{montantRemise.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-border">
                                <span className="text-muted-foreground">Montant HT après remise :</span>
                                <span className="font-semibold">{montantHTApresRemise.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                              </div>
                            </>
                          )}
                          {expenseTva > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">TVA ({expenseTva}%) :</span>
                              <span className="font-medium">{montantTVA.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                            </div>
                          )}
                          {expenseTps > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">TPS ({expenseTps}%) :</span>
                              <span className="font-medium">{montantTPS.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-border font-bold text-lg">
                            <span>Montant TTC :</span>
                            <span className="text-primary">{montantTTC.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <Label htmlFor="notesExpense">Notes (optionnel)</Label>
                  <Input
                    id="notesExpense"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Remarques ou commentaires"
                  />
                </div>

                <Button onClick={handleCreateExpenseInvoice} className="w-full" disabled={!selectedExpenseId}>
                  Créer la facture de dépense
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer une facture professionnelle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Afficher le numéro de facture qui sera généré */}
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Numéro de facture qui sera attribué :</Label>
                      <p className="text-2xl font-bold text-primary mt-1 font-mono">{nextInvoiceNumber}</p>
                    </div>
                    <div className="p-3 bg-primary/20 rounded-lg">
                      <FileText className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="trip">Sélectionner un trajet *</Label>
                <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un trajet">
                      {selectedTripId && (() => {
                        const selectedTrip = getTrip(selectedTripId);
                        if (!selectedTrip) return selectedTripId;
                        const shortId = selectedTripId.slice(-6);
                        return `[ID: ${shortId}] ${selectedTrip.origine} → ${selectedTrip.destination}`;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableTrips.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        <p className="mb-2">⚠️ Aucun trajet disponible pour facturation</p>
                        <p className="text-xs">
                          Pour créer une facture, le trajet doit :<br/>
                          • Avoir une recette &gt; 0 FCFA<br/>
                          • Ne pas avoir de facture existante
                        </p>
                      </div>
                    ) : (
                      availableTrips.map(trip => {
                        const statusLabels = {
                          planifie: 'Planifié',
                          en_cours: 'En cours',
                          termine: 'Terminé',
                          annule: 'Annulé'
                        };
                        const tripDetails = getTrip(trip.id);
                        const driver = tripDetails ? drivers.find(d => d.id === tripDetails.chauffeurId) : null;
                        // Extraire les 6 derniers caractères de l'ID pour un affichage plus court
                        const shortId = trip.id.slice(-6);
                        const dateDepart = tripDetails ? new Date(tripDetails.dateDepart).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
                        
                        return (
                          <SelectItem key={trip.id} value={trip.id} className="py-2">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">ID: {shortId}</span>
                                <span className="font-semibold">{trip.origine} → {trip.destination}</span>
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                                {dateDepart && <span>📅 {dateDepart}</span>}
                                {driver && <span>👤 {driver.prenom} {driver.nom}</span>}
                                {tripDetails?.client && <span>🏢 {tripDetails.client}</span>}
                                <span className="font-semibold text-primary">{trip.recette.toLocaleString('fr-FR')} FCFA</span>
                                <span>({statusLabels[trip.statut]})</span>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Afficher TOUTES les détails du trajet sélectionné */}
              {selectedTripId && (() => {
                const selectedTrip = getTrip(selectedTripId);
                if (!selectedTrip) return null;
                const driver = drivers.find(d => d.id === selectedTrip.chauffeurId);
                const tracteur = selectedTrip.tracteurId ? trucks.find(t => t.id === selectedTrip.tracteurId) : null;
                const remorqueuse = selectedTrip.remorqueuseId ? trucks.find(t => t.id === selectedTrip.remorqueuseId) : null;
                
                const getStatusLabel = (statut: string) => {
                  const labels: Record<string, string> = {
                    planifie: 'Planifié',
                    en_cours: 'En cours',
                    termine: 'Terminé',
                    annule: 'Annulé'
                  };
                  return labels[statut] || statut;
                };

                const getStatusColor = (statut: string) => {
                  const colors: Record<string, string> = {
                    planifie: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
                    en_cours: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
                    termine: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
                    annule: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                  };
                  return colors[statut] || '';
                };

                return (
                  <div className="bg-gradient-to-br from-muted/50 to-muted/30 border-2 border-primary/20 rounded-lg p-5 space-y-4 shadow-md">
                    {/* En-tête avec ID */}
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <Label className="text-base font-bold">📋 Informations complètes du trajet</Label>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(selectedTrip.statut)}>
                          {getStatusLabel(selectedTrip.statut)}
                        </Badge>
                        <span className="font-mono text-xs bg-primary/20 text-primary px-3 py-1.5 rounded font-bold border border-primary/30">
                          ID: {selectedTripId}
                        </span>
                      </div>
                    </div>

                    {/* Informations principales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Itinéraire */}
                      <div className="md:col-span-2 bg-primary/5 rounded-lg p-3 border border-primary/10">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-muted-foreground uppercase">Itinéraire</span>
                        </div>
                        <p className="text-lg font-bold text-primary">
                          {selectedTrip.origine} → {selectedTrip.destination}
                        </p>
                      </div>

                      {/* Dates */}
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground">📅 Date de départ</span>
                          <p className="text-sm font-medium mt-1">{new Date(selectedTrip.dateDepart).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        {selectedTrip.dateArrivee && (
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground">📅 Date d'arrivée</span>
                            <p className="text-sm font-medium mt-1">{new Date(selectedTrip.dateArrivee).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          </div>
                        )}
                        {!selectedTrip.dateArrivee && (
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground">📅 Date d'arrivée</span>
                            <p className="text-sm text-muted-foreground italic mt-1">À définir</p>
                          </div>
                        )}
                      </div>

                      {/* Chauffeur */}
                      {driver && (
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground">👤 Chauffeur</span>
                            <p className="text-sm font-medium mt-1">{driver.prenom} {driver.nom}</p>
                            {driver.telephone && (
                              <p className="text-xs text-muted-foreground mt-1">📞 {driver.telephone}</p>
                            )}
                            {driver.cni && (
                              <p className="text-xs text-muted-foreground">🪪 CNI: {driver.cni}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tracteur */}
                      {tracteur && (
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground">🚛 Tracteur</span>
                            <p className="text-sm font-medium mt-1">{tracteur.immatriculation}</p>
                            <p className="text-xs text-muted-foreground mt-1">Modèle: {tracteur.modele}</p>
                          </div>
                        </div>
                      )}

                      {/* Remorqueuse */}
                      {remorqueuse && (
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground">🚚 Remorqueuse</span>
                            <p className="text-sm font-medium mt-1">{remorqueuse.immatriculation}</p>
                            <p className="text-xs text-muted-foreground mt-1">Modèle: {remorqueuse.modele}</p>
                          </div>
                        </div>
                      )}

                      {/* Client */}
                      {selectedTrip.client && (
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground">🏢 Client</span>
                            <p className="text-sm font-medium mt-1">{selectedTrip.client}</p>
                          </div>
                        </div>
                      )}

                      {/* Marchandise */}
                      {selectedTrip.marchandise && (
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground">📦 Marchandise</span>
                            <p className="text-sm font-medium mt-1">{selectedTrip.marchandise}</p>
                          </div>
                        </div>
                      )}

                      {/* Recette */}
                      <div className="md:col-span-2 bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border-2 border-green-200 dark:border-green-800">
                        <span className="text-xs font-semibold text-green-700 dark:text-green-400">💰 Recette</span>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">
                          {selectedTrip.recette.toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>

                      {/* Description */}
                      {selectedTrip.description && (
                        <div className="md:col-span-2 space-y-2">
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground">📝 Description</span>
                            <p className="text-sm mt-1 bg-background/50 p-2 rounded border border-border">
                              {selectedTrip.description}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div>
                <Label htmlFor="modePaiement">Mode de paiement (optionnel)</Label>
                <Select value={modePaiement || 'none'} onValueChange={(value) => setModePaiement(value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    <SelectItem value="Espèces">Espèces</SelectItem>
                    <SelectItem value="Virement bancaire">Virement bancaire</SelectItem>
                    <SelectItem value="Chèque">Chèque</SelectItem>
                    <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Section Remise, TVA et TPS */}
              {selectedTripId && (() => {
                const selectedTrip = getTrip(selectedTripId);
                if (!selectedTrip) return null;
                
                const montantHTInitial = selectedTrip.recette;
                const montantRemise = montantHTInitial * (remise / 100);
                const montantHTApresRemise = montantHTInitial - montantRemise;
                const montantTVA = montantHTApresRemise * (tva / 100);
                const montantTPS = montantHTApresRemise * (tps / 100);
                const montantTTC = montantHTApresRemise + montantTVA + montantTPS;

                return (
                  <div className="space-y-4 border-t pt-4">
                    {/* Remise */}
                    <div>
                      <Label className="text-base font-semibold mb-3 block">Remise (optionnel)</Label>
                      <div>
                        <Label htmlFor="remise">Remise (%)</Label>
                        <NumberInput
                          id="remise"
                          value={remise}
                          onChange={(value) => setRemise(value || 0)}
                          min={0}
                          max={100}
                          step={0.1}
                          placeholder="0"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Ex: 10 pour 10% de remise</p>
                      </div>
                    </div>

                    {/* TVA et TPS */}
                    <div>
                      <Label className="text-base font-semibold mb-3 block">Taux et taxes</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="tva">TVA (%)</Label>
                          <NumberInput
                            id="tva"
                            value={tva}
                            onChange={(value) => setTva(value || 0)}
                            min={0}
                            max={100}
                            step={0.1}
                            placeholder="0"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Ex: 19.25 pour 19.25%</p>
                        </div>
                        <div>
                          <Label htmlFor="tps">TPS (%)</Label>
                          <NumberInput
                            id="tps"
                            value={tps}
                            onChange={(value) => setTps(value || 0)}
                            min={0}
                            max={100}
                            step={0.1}
                            placeholder="0"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Ex: 5 pour 5%</p>
                        </div>
                      </div>
                    </div>

                    {/* Aperçu du calcul */}
                    <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
                      <Label className="text-sm font-semibold">Aperçu du calcul :</Label>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Montant HT initial :</span>
                          <span className="font-medium">{montantHTInitial.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        {remise > 0 && (
                          <>
                            <div className="flex justify-between text-orange-600 dark:text-orange-400">
                              <span>Remise ({remise}%) :</span>
                              <span className="font-medium">-{montantRemise.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-border">
                              <span className="text-muted-foreground">Montant HT après remise :</span>
                              <span className="font-semibold">{montantHTApresRemise.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                            </div>
                          </>
                        )}
                        {tva > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">TVA ({tva}%) :</span>
                            <span className="font-medium">{montantTVA.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                          </div>
                        )}
                        {tps > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">TPS ({tps}%) :</span>
                            <span className="font-medium">{montantTPS.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-border font-bold text-lg">
                          <span>Montant TTC :</span>
                          <span className="text-primary">{montantTTC.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Remarques ou commentaires"
                />
              </div>

                <Button onClick={handleCreateInvoice} className="w-full">Créer la facture</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        }
      />

      {/* Barre de filtres */}
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-br from-background to-muted/20 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
            {/* Recherche par nom/número */}
            <div className="space-y-2">
              <Label htmlFor="search" className="text-xs">Recherche</Label>
              <Input
                id="search"
                placeholder="Client ou N° facture"
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                className="h-9"
              />
            </div>

            {/* Filtre par type de facture */}
            <div className="space-y-2">
              <Label htmlFor="typeFilter" className="text-xs">Type</Label>
              <Select
                value={filters.type || 'all'}
                onValueChange={(value) => setFilters({ ...filters, type: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="trip">🚛 Trajets</SelectItem>
                  <SelectItem value="expense">💰 Dépenses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtre par trajet */}
            <div className="space-y-2">
              <Label htmlFor="tripFilter" className="text-xs">Trajet</Label>
              <Select
                value={filters.tripId || 'all'}
                onValueChange={(value) => setFilters({ ...filters, tripId: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Tous les trajets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les trajets</SelectItem>
                  {Array.from(new Set(invoices.map(inv => inv.trajetId).filter((id): id is string => !!id))).map(tripId => {
                    const trip = getTrip(tripId);
                    if (!trip || !tripId) return null;
                    return (
                      <SelectItem key={tripId} value={tripId}>
                        {trip.origine} → {trip.destination}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Filtre par chauffeur */}
            <div className="space-y-2">
              <Label htmlFor="driverFilter" className="text-xs">Chauffeur</Label>
              <Select
                value={filters.driverId || 'all'}
                onValueChange={(value) => setFilters({ ...filters, driverId: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Tous les chauffeurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les chauffeurs</SelectItem>
                  {Array.from(new Set(
                    invoices
                      .map(inv => {
                        const trip = getTrip(inv.trajetId);
                        const expense = getExpense(inv.expenseId);
                        return trip?.chauffeurId || expense?.chauffeurId;
                      })
                      .filter((id): id is string => !!id && id !== '')
                  )).map(driverId => {
                    const driver = drivers.find(d => d.id === driverId);
                    if (!driver || !driverId) return null;
                    return (
                      <SelectItem key={driverId} value={driverId}>
                        {driver.prenom} {driver.nom}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Filtre par statut */}
            <div className="space-y-2">
              <Label htmlFor="statusFilter" className="text-xs">Statut</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="payee">Payée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtre par date (du) */}
            <div className="space-y-2">
              <Label htmlFor="dateFrom" className="text-xs">Date du</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="h-9"
              />
            </div>

            {/* Filtre par date (au) */}
            <div className="space-y-2">
              <Label htmlFor="dateTo" className="text-xs">Date au</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="h-9"
              />
            </div>
          </div>

          {/* Indicateur de filtres actifs */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>
                  {filteredInvoices.length} facture{filteredInvoices.length > 1 ? 's' : ''} trouvée{filteredInvoices.length > 1 ? 's' : ''} 
                  {filteredInvoices.length !== invoices.length && ` sur ${invoices.length} total`}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tableau des factures */}
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-br from-background to-muted/20">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              📄 Factures - Montant en attente: 
              <span className="text-red-600 dark:text-red-400 font-bold">
                {montantEnAttente.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
              </span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Détails</TableHead>
                <TableHead>Date création</TableHead>
                <TableHead className="text-right">Montant TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {hasActiveFilters ? (
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 text-muted-foreground" />
                        <p>Aucune facture ne correspond aux filtres sélectionnés</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetFilters}
                          className="mt-2"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Réinitialiser les filtres
                        </Button>
                      </div>
                    ) : (
                      'Aucune facture enregistrée'
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => {
                  const trip = getTrip(invoice.trajetId);
                  const expense = getExpense(invoice.expenseId);
                  const isExpenseInvoice = !!invoice.expenseId;
                  
                  return (
                    <TableRow key={invoice.id} className="hover:bg-muted/50 transition-colors duration-200">
                      <TableCell>
                        <div className="font-mono text-sm font-semibold text-foreground">
                          {invoice.numero}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isExpenseInvoice ? (
                          <Badge variant="outline" className="bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border-orange-300">
                            💰 Dépense
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-300">
                            🚛 Trajet
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isExpenseInvoice && expense ? (
                          <div>
                            <div className="font-semibold">{expense.description}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">{expense.categorie}</span>
                              {expense.sousCategorie && <span> - {expense.sousCategorie}</span>}
                            </div>
                            {expense.quantite !== undefined && expense.quantite > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Quantité: {expense.quantite.toLocaleString('fr-FR')} {expense.categorie === 'Carburant' ? 'Litres' : expense.categorie === 'Maintenance' ? 'Pièces' : 'Unités'}
                              </div>
                            )}
                            {expense.prixUnitaire !== undefined && expense.prixUnitaire > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Prix unitaire: {expense.prixUnitaire.toLocaleString('fr-FR')} FCFA
                              </div>
                            )}
                            {expense.chauffeurId && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Chauffeur: {getDriverName(expense.chauffeurId)}
                              </div>
                            )}
                            {expense.fournisseurId && (
                              <div className="text-xs text-muted-foreground">
                                Fournisseur: {thirdParties.find(tp => tp.id === expense.fournisseurId)?.nom || '-'}
                              </div>
                            )}
                          </div>
                        ) : trip ? (
                          <div>
                            <div>{getTripLabel(invoice.trajetId)}</div>
                            {trip.client && (
                              <div className="text-xs text-muted-foreground">Client: {trip.client}</div>
                            )}
                            {trip.marchandise && (
                              <div className="text-xs text-muted-foreground">📦 Marchandise: {trip.marchandise}</div>
                            )}
                            {trip && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Chauffeur: {getDriverName(trip.chauffeurId)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{new Date(invoice.dateCreation).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell className="text-right">
                        <div className="font-bold text-primary">
                          {invoice.montantTTC.toLocaleString('fr-FR')} FCFA
                        </div>
                        {invoice.montantPaye !== undefined && invoice.montantPaye > 0 && invoice.montantPaye < invoice.montantTTC && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Payé: {invoice.montantPaye.toLocaleString('fr-FR')} FCFA
                            <span className="text-orange-600 dark:text-orange-400 ml-1">
                              (Reste: {(invoice.montantTTC - invoice.montantPaye).toLocaleString('fr-FR')} FCFA)
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={invoice.statut === 'payee' ? 'default' : invoice.montantPaye && invoice.montantPaye > 0 ? 'secondary' : 'secondary'}
                          className={
                            invoice.statut === 'payee' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' 
                              : invoice.montantPaye && invoice.montantPaye > 0
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'
                          }
                        >
                  {invoice.statut === 'payee' ? (
                    <><CheckCircle2 className="mr-1 h-3 w-3" /> Payée</>
                  ) : invoice.montantPaye && invoice.montantPaye > 0 ? (
                    <><Clock className="mr-1 h-3 w-3" /> Paiement partiel</>
                  ) : (
                    <><Clock className="mr-1 h-3 w-3" /> En attente</>
                  )}
                </Badge>
                      </TableCell>
                      <TableCell>
                        {invoice.notes ? (
                          <div className="text-sm text-muted-foreground max-w-xs" title={invoice.notes}>
                            <span className="inline-flex items-center gap-1">
                              📝 <span className="truncate">{invoice.notes}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setIsViewDialogOpen(true);
                            }}
                            className="hover:shadow-md transition-all duration-200"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                {(invoice.statut === 'en_attente' || (invoice.montantPaye !== undefined && invoice.montantPaye > 0 && invoice.montantPaye < invoice.montantTTC)) && (
                  <Button 
                              size="sm"
                    variant="default"
                    onClick={() => handleMarkPaid(invoice.id)}
                              className="hover:shadow-md transition-all duration-200"
                  >
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              {invoice.montantPaye && invoice.montantPaye > 0 ? 'Modifier paiement' : 'Marquer payée'}
                  </Button>
                )}
                          {/* MODE TEST : Suppression autorisée pour toutes les factures */}
                          <Button 
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            className="hover:shadow-md transition-all duration-200"
                            title="Supprimer la facture (mode test)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
              </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
            </CardContent>
          </Card>

      {/* Modal de visualisation de facture */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto invoice-print">
          {selectedInvoice && (() => {
            const trip = getTrip(selectedInvoice.trajetId);
            const expense = getExpense(selectedInvoice.expenseId);
            const driver = drivers.find(d => d.id === trip?.chauffeurId || d.id === expense?.chauffeurId);
            const isExpenseInvoice = !!selectedInvoice.expenseId;
            const expenseDriver = expense?.chauffeurId ? drivers.find(d => d.id === expense.chauffeurId) : null;
            const expenseTruck = expense?.camionId ? trucks.find(t => t.id === expense.camionId) : null;
            const expenseSupplier = expense?.fournisseurId ? thirdParties.find(tp => tp.id === expense.fournisseurId) : null;
            
            return (
              <>
                {/* En-tête avec bouton Imprimer */}
                <div className="border-b pb-4 mb-6 no-print">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-xl">Facture {selectedInvoice.numero}</span>
                    <div className="flex items-center gap-2">
                      {isExpenseInvoice ? (
                        <Badge variant="outline" className="bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border-orange-300">
                          💰 Dépense
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-300">
                          🚛 Trajet
                        </Badge>
                      )}
                      <Badge variant={selectedInvoice.statut === 'payee' ? 'default' : 'secondary'}>
                        {selectedInvoice.statut === 'payee' ? 'Payée' : 'En attente'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadPDF}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Télécharger PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handlePrintInvoice}
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimer
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* En-tête de facture */}
                  <div className="border-b pb-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-bold text-lg mb-2">Truck Track Cameroun</h3>
                        <p className="text-sm text-muted-foreground">
                          Transport de marchandises<br />
                          Douala, Cameroun<br />
                          Tél: +237 6 XX XX XX XX<br />
                          Email: contact@trucktrack.cm
                        </p>
                      </div>
                      <div className="text-right">
                        {isExpenseInvoice ? (
                          <>
                            <p className="text-sm text-muted-foreground">Fournisseur:</p>
                            <p className="font-semibold">{expenseSupplier?.nom || 'N/A'}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">Client:</p>
                            <p className="font-semibold">{trip?.client || 'N/A'}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Détails du service ou de la dépense */}
                  {isExpenseInvoice && expense ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-3">Détails de la dépense</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Description:</span>
                            <span className="font-medium">{expense.description}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Catégorie:</span>
                            <span className="font-medium">{expense.categorie}</span>
                          </div>
                          {expense.sousCategorie && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Sous-catégorie:</span>
                              <span className="font-medium">{expense.sousCategorie}</span>
                            </div>
                          )}
                          {expense.quantite !== undefined && expense.quantite > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Quantité:</span>
                              <span className="font-medium">
                                {expense.quantite.toLocaleString('fr-FR')} {expense.categorie === 'Carburant' ? 'Litres' : expense.categorie === 'Maintenance' ? 'Pièces' : 'Unités'}
                              </span>
                            </div>
                          )}
                          {expense.prixUnitaire !== undefined && expense.prixUnitaire > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Prix unitaire:</span>
                              <span className="font-medium">{expense.prixUnitaire.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Prix total:</span>
                            <span className="font-medium font-bold">{expense.montant.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date de la dépense:</span>
                            <span className="font-medium">{new Date(expense.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Informations du véhicule et du chauffeur */}
                      {(expenseTruck || expenseDriver) && (
                        <div>
                          <h4 className="font-semibold mb-3">Informations du véhicule</h4>
                          <div className="space-y-2 text-sm">
                            {expenseTruck && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Camion:</span>
                                  <span className="font-medium">{expenseTruck.immatriculation}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Modèle:</span>
                                  <span className="font-medium">{expenseTruck.modele}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Type:</span>
                                  <span className="font-medium">{expenseTruck.type === 'tracteur' ? 'Tracteur' : 'Remorqueuse'}</span>
                                </div>
                              </>
                            )}
                            {expenseDriver && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Chauffeur:</span>
                                  <span className="font-medium">{expenseDriver.prenom} {expenseDriver.nom}</span>
                                </div>
                                {expenseDriver.telephone && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Téléphone:</span>
                                    <span className="font-medium">{expenseDriver.telephone}</span>
                                  </div>
                                )}
                                {expenseDriver.cni && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">CNI:</span>
                                    <span className="font-medium">{expenseDriver.cni}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Informations du fournisseur */}
                      {expenseSupplier && (
                        <div>
                          <h4 className="font-semibold mb-3">Informations du fournisseur</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Nom:</span>
                              <span className="font-medium">{expenseSupplier.nom}</span>
                            </div>
                            {expenseSupplier.telephone && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Téléphone:</span>
                                <span className="font-medium">{expenseSupplier.telephone}</span>
                              </div>
                            )}
                            {expenseSupplier.email && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Email:</span>
                                <span className="font-medium">{expenseSupplier.email}</span>
                              </div>
                            )}
                            {expenseSupplier.adresse && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Adresse:</span>
                                <span className="font-medium">{expenseSupplier.adresse}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Lien avec trajet si disponible */}
                      {expense.tripId && (() => {
                        const linkedTrip = trips.find(t => t.id === expense.tripId);
                        if (linkedTrip) {
                          return (
                            <div>
                              <h4 className="font-semibold mb-3">Trajet associé</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Itinéraire:</span>
                                  <span className="font-medium">{linkedTrip.origine} → {linkedTrip.destination}</span>
                                </div>
                                {linkedTrip.client && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Client:</span>
                                    <span className="font-medium">{linkedTrip.client}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  ) : trip ? (
                    <div>
                      <h4 className="font-semibold mb-3">Détails du service</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Trajet:</span>
                          <span className="font-medium">{trip.origine} → {trip.destination}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Chauffeur:</span>
                          <span className="font-medium">{driver ? `${driver.prenom} ${driver.nom}` : 'N/A'}</span>
                        </div>
                        {trip.tracteurId && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tracteur:</span>
                            <span className="font-medium">{getTruckLabel(trip.tracteurId)}</span>
                          </div>
                        )}
                        {trip.remorqueuseId && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Remorque:</span>
                            <span className="font-medium">{getTruckLabel(trip.remorqueuseId)}</span>
                          </div>
                        )}
                        {trip.marchandise && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Marchandise:</span>
                            <span className="font-medium">{trip.marchandise}</span>
                          </div>
                        )}
                        {trip.description && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Description:</span>
                            <span className="font-medium">{trip.description}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date de départ:</span>
                          <span className="font-medium">{new Date(trip.dateDepart).toLocaleDateString('fr-FR')}</span>
                        </div>
                        {trip.dateArrivee && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date d'arrivée:</span>
                            <span className="font-medium">{new Date(trip.dateArrivee).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Détails financiers */}
                  <div>
                    <h4 className="font-semibold mb-3">Détails financiers</h4>
                    <div className="space-y-2 text-sm border rounded-lg p-4 bg-primary/5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Montant HT initial:</span>
                        <span className="font-semibold">{selectedInvoice.montantHT.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      {selectedInvoice.remise && selectedInvoice.remise > 0 && selectedInvoice.montantHTApresRemise && (
                        <>
                          <div className="flex justify-between text-orange-600 dark:text-orange-400">
                            <span className="text-muted-foreground">Remise ({selectedInvoice.remise}%):</span>
                            <span className="font-semibold">-{(selectedInvoice.montantHT - selectedInvoice.montantHTApresRemise).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-border">
                            <span className="text-muted-foreground">Montant HT après remise:</span>
                            <span className="font-semibold">{selectedInvoice.montantHTApresRemise.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                          </div>
                        </>
                      )}
                      {selectedInvoice.tva && selectedInvoice.tva > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">TVA:</span>
                          <span className="font-semibold">{selectedInvoice.tva.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                        </div>
                      )}
                      {selectedInvoice.tps && selectedInvoice.tps > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">TPS:</span>
                          <span className="font-semibold">{selectedInvoice.tps.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-border">
                        <span className="text-lg font-semibold">Montant TTC:</span>
                        <span className="text-2xl font-bold text-primary">{selectedInvoice.montantTTC.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
                      </div>
                      {selectedInvoice.montantPaye !== undefined && selectedInvoice.montantPaye > 0 && (
                        <>
                          <div className="flex justify-between pt-2 border-t border-border">
                            <span className="text-muted-foreground">Montant payé:</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {selectedInvoice.montantPaye.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA
                            </span>
                          </div>
                          {selectedInvoice.montantPaye < selectedInvoice.montantTTC && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Reste à payer:</span>
                              <span className="font-semibold text-orange-600 dark:text-orange-400">
                                {(selectedInvoice.montantTTC - selectedInvoice.montantPaye).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Informations de paiement */}
                  <div>
                    <h4 className="font-semibold mb-3">Informations de paiement</h4>
                    <div className="space-y-2 text-sm border rounded-lg p-4 bg-muted/30">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date de création:</span>
                        <span className="font-medium">{new Date(selectedInvoice.dateCreation).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      {selectedInvoice.modePaiement && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Mode de paiement:</span>
                          <span className="font-medium">{selectedInvoice.modePaiement}</span>
                        </div>
                      )}
                      {selectedInvoice.datePaiement && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date de paiement:</span>
                          <span className="font-medium">{new Date(selectedInvoice.datePaiement).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Statut:</span>
                        <Badge 
                          variant={selectedInvoice.statut === 'payee' ? 'default' : selectedInvoice.montantPaye && selectedInvoice.montantPaye > 0 ? 'secondary' : 'secondary'} 
                          className={
                            selectedInvoice.statut === 'payee' 
                              ? 'ml-auto bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                              : selectedInvoice.montantPaye && selectedInvoice.montantPaye > 0
                              ? 'ml-auto bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                              : 'ml-auto'
                          }
                        >
                          {selectedInvoice.statut === 'payee' 
                            ? 'Payée' 
                            : selectedInvoice.montantPaye && selectedInvoice.montantPaye > 0
                            ? 'Paiement partiel'
                            : 'En attente'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Informations additionnelles */}
                  {selectedInvoice.notes && (
                    <div>
                      <h4 className="font-semibold mb-3">Notes</h4>
                      <div className="text-sm border rounded-lg p-4 bg-muted/30">
                        <p className="font-medium">{selectedInvoice.notes}</p>
                      </div>
                    </div>
                  )}
      </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog de paiement partiel */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer le paiement</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant TTC:</span>
                  <span className="font-bold text-primary">
                    {selectedInvoice.montantTTC.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                {selectedInvoice.montantPaye !== undefined && selectedInvoice.montantPaye > 0 && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Déjà payé:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {selectedInvoice.montantPaye.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                )}
                {selectedInvoice.montantPaye !== undefined && selectedInvoice.montantPaye > 0 && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Reste à payer:</span>
                    <span className="font-medium text-orange-600 dark:text-orange-400">
                      {(selectedInvoice.montantTTC - selectedInvoice.montantPaye).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="paymentAmount">Montant payé (FCFA) *</Label>
                <NumberInput
                  id="paymentAmount"
                  value={paymentAmount}
                  onChange={(value) => setPaymentAmount(value || 0)}
                  min={0}
                  max={selectedInvoice.montantTTC}
                  placeholder="0"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Le montant peut être partiel. Maximum: {selectedInvoice.montantTTC.toLocaleString('fr-FR')} FCFA
                </p>
              </div>

              {paymentAmount > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Montant payé:</span>
                    <span className="font-bold text-primary">
                      {paymentAmount.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reste à payer:</span>
                    <span className="font-medium text-orange-600 dark:text-orange-400">
                      {(selectedInvoice.montantTTC - paymentAmount).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  {paymentAmount >= selectedInvoice.montantTTC && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 pt-2 border-t">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Facture sera marquée comme payée complètement</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="paymentMode">Mode de paiement (optionnel)</Label>
                <Select 
                  value={selectedInvoice.modePaiement || 'none'} 
                  onValueChange={(value) => {
                    if (selectedInvoice) {
                      setSelectedInvoice({
                        ...selectedInvoice,
                        modePaiement: value === 'none' ? undefined : value
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    <SelectItem value="Espèces">Espèces</SelectItem>
                    <SelectItem value="Virement bancaire">Virement bancaire</SelectItem>
                    <SelectItem value="Chèque">Chèque</SelectItem>
                    <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleConfirmPayment} disabled={paymentAmount <= 0}>
                  Enregistrer le paiement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
