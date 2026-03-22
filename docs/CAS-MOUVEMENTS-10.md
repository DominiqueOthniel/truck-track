# 10 cas de figure — tous les mouvements (données Supabase)

Fichier SQL à coller : **`supabase-seed-10-mouvements.sql`**

> **Non couvert par Postgres** : mouvements **caisse** (`localStorage`) et **crédits** (`localStorage`). Pour les tester, utilise l’app (pages Caisse / Crédits).

| # | Cas | Table / endroit | Ce que ça représente |
|---|-----|-----------------|------------------------|
| **1** | Apport chauffeur | `driver_transactions` (`type = apport`) | Argent apporté par le chauffeur (entrée sur sa poche). |
| **2** | Sortie chauffeur | `driver_transactions` (`type = sortie`) | Dépense payée par le chauffeur (sortie). |
| **3** | Dépense carburant | `expenses` | Sortie d’argent liée au camion / trajet (carburant). |
| **4** | Dépense péage / maintenance | `expenses` | Autres charges (péage, garage, fournisseur). |
| **5** | Facture payée | `invoices` (`statut = payee`, `montantPaye = montantTTC`) | Revenu client entièrement encaissé. |
| **6** | Facture partielle ou en attente | `invoices` | Créance résiduelle (paiement partiel ou 0 payé). |
| **7** | Banque — dépôt | `bank_transactions` (`depot`) | Entrée d’espèces / versement sur le compte. |
| **8** | Banque — retrait | `bank_transactions` (`retrait`) | Sortie d’espèces / paiement depuis le compte. |
| **9** | Banque — virement entrant | `bank_transactions` (`virement`) | Crédit client / virement reçu (comme dans les règles app). |
| **10** | Banque — prélèvement + frais | `bank_transactions` (`prelevement`, `frais`) | Prélèvement fournisseur et commissions bancaires. |

**Bonus dans le même script** : transfert interne **principal → épargne** modélisé par un **`retrait`** sur le compte courant et un **`dépôt`** sur l’épargne (cohérent avec la logique crédit/débit de l’app).

Après exécution, les **`soldeActuel`** des comptes banque sont **recalculés** en fin de script.
