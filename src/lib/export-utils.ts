import * as XLSX from 'xlsx';

interface ExportColumn<T> {
  header: string;
  value: (row: T, index: number) => string | number | null | undefined;
  // Style conditionnel pour la cellule (permet de colorier en rouge/vert, etc.)
  cellStyle?: (row: T, index: number) => 'positive' | 'negative' | 'neutral' | undefined;
}

interface ExportOptions<T> {
  title: string;
  fileName: string;
  sheetName?: string;
  filtersDescription?: string;
  columns: ExportColumn<T>[];
  rows: T[];
}

export function exportToExcel<T>(options: ExportOptions<T>) {
  const { title, fileName, sheetName = 'Données', filtersDescription, columns, rows } = options;

  const data: (string | number)[][] = [];

  // Première ligne : titre
  data.push([title]);

  // Deuxième ligne : filtres, si présents
  if (filtersDescription) {
    data.push([filtersDescription]);
  }

  // Ligne vide de séparation
  data.push([]);

  // En‑têtes
  data.push(columns.map((c) => c.header));

  // Lignes de données
  rows.forEach((row, index) => {
    data.push(
      columns.map((c) => {
        const value = c.value(row, index);
        if (value == null) return '';
        return typeof value === 'number' || typeof value === 'string'
          ? value
          : String(value);
      }),
    );
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

// Interface pour les totaux à afficher dans l'export
export interface ExportTotal {
  label: string;
  value: string | number;
  style?: 'positive' | 'negative' | 'neutral';
  icon?: string;
}

export interface PDFExportOptions<T> extends ExportOptions<T> {
  headerColor?: string; // Couleur de fond de l'en-tête (défaut: bleu)
  headerTextColor?: string; // Couleur du texte de l'en-tête (défaut: blanc)
  evenRowColor?: string; // Couleur des lignes paires (défaut: gris clair)
  oddRowColor?: string; // Couleur des lignes impaires (défaut: blanc)
  accentColor?: string; // Couleur d'accent pour le titre (défaut: bleu)
  totals?: ExportTotal[]; // Totaux à afficher en bas du tableau
}

export function exportToPrintablePDF<T>(options: ExportOptions<T> | PDFExportOptions<T>) {
  const { title, filtersDescription, columns, rows } = options;
  
  // Couleurs par défaut ou personnalisées
  const pdfOptions = options as PDFExportOptions<T>;
  const headerColor = pdfOptions.headerColor || '#1e40af'; // Bleu foncé
  const headerTextColor = pdfOptions.headerTextColor || '#ffffff'; // Blanc
  const evenRowColor = pdfOptions.evenRowColor || '#f0f9ff'; // Bleu très clair
  const oddRowColor = pdfOptions.oddRowColor || '#ffffff'; // Blanc
  const accentColor = pdfOptions.accentColor || '#1e40af'; // Bleu foncé
  const totals = pdfOptions.totals || [];

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const tableHeaders = columns
    .map((c) => `<th>${c.header}</th>`)
    .join('');

  const tableRows = rows
    .map((row, index) => {
      const rowColor = index % 2 === 0 ? evenRowColor : oddRowColor;
      const cells = columns
        .map((c) => {
          const value = c.value(row, index);
          const cellStyle = c.cellStyle ? c.cellStyle(row, index) : undefined;
          
          // Appliquer les styles conditionnels (vert pour positif, rouge pour négatif)
          let styleAttr = '';
          if (cellStyle === 'positive') {
            styleAttr = 'style="color: #166534; font-weight: 600; background-color: rgba(34, 197, 94, 0.1);"';
          } else if (cellStyle === 'negative') {
            styleAttr = 'style="color: #991b1b; font-weight: 600; background-color: rgba(239, 68, 68, 0.1);"';
          }
          
          return `<td ${styleAttr}>${value ?? ''}</td>`;
        })
        .join('');
      return `<tr style="background-color: ${rowColor};">${cells}</tr>`;
    })
    .join('');

  const filtersBlock = filtersDescription
    ? `<div class="filters-box">${filtersDescription}</div>`
    : '';

  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <title>${title}</title>
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            padding: 24px;
            color: #111827;
            background: #fff;
            margin: 0;
          }
          .header {
            border-bottom: 3px solid ${accentColor};
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          h1 {
            font-size: 24px;
            margin: 0 0 8px 0;
            color: ${accentColor};
            font-weight: 700;
          }
          .date {
            font-size: 12px;
            color: #6b7280;
            margin: 0;
          }
          .filters-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 20px;
            font-size: 12px;
            color: #92400e;
          }
          .filters-box::before {
            content: "🔍 ";
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          thead {
            background: linear-gradient(135deg, ${headerColor} 0%, ${adjustColor(headerColor, -20)} 100%);
          }
          thead th {
            padding: 12px 10px;
            text-align: left;
            font-size: 11px;
            font-weight: 600;
            color: ${headerTextColor};
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: none;
          }
          tbody td {
            padding: 10px;
            font-size: 12px;
            border-bottom: 1px solid #e5e7eb;
            color: #374151;
          }
          tbody tr:hover {
            background-color: #dbeafe !important;
          }
          tbody tr:last-child td {
            border-bottom: none;
          }
          .footer {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: #9ca3af;
            text-align: center;
          }
          .stats {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
          }
          .stat-box {
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border: 1px solid #22c55e;
            border-radius: 8px;
            padding: 12px 20px;
            text-align: center;
          }
          .stat-box.primary {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-color: ${accentColor};
          }
          .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: ${accentColor};
          }
          .stat-label {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
          }
          .totals-section {
            margin-top: 24px;
            padding: 20px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 12px;
            border: 2px solid ${accentColor};
          }
          .totals-title {
            font-size: 14px;
            font-weight: 700;
            color: ${accentColor};
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
          }
          .totals-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
          }
          .total-item {
            padding: 16px;
            border-radius: 8px;
            text-align: center;
          }
          .total-item.positive {
            background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
            border: 1px solid #22c55e;
          }
          .total-item.negative {
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            border: 1px solid #ef4444;
          }
          .total-item.neutral {
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            border: 1px solid #9ca3af;
          }
          .total-label {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .total-value {
            font-size: 20px;
            font-weight: 700;
          }
          .total-item.positive .total-value {
            color: #166534;
          }
          .total-item.negative .total-value {
            color: #991b1b;
          }
          .total-item.neutral .total-value {
            color: #374151;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
            tbody tr:hover {
              background-color: inherit !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 ${title}</h1>
          <p class="date">Généré le ${currentDate}</p>
        </div>
        <div class="stats">
          <div class="stat-box primary">
            <div class="stat-value">${rows.length}</div>
            <div class="stat-label">Total enregistrements</div>
          </div>
        </div>
        ${filtersBlock}
        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        ${totals.length > 0 ? `
        <div class="totals-section">
          <div class="totals-title">📊 RÉCAPITULATIF DES TOTAUX</div>
          <div class="totals-grid">
            ${totals.map(t => `
              <div class="total-item ${t.style || 'neutral'}">
                <div class="total-label">${t.icon || ''} ${t.label}</div>
                <div class="total-value">${t.value}</div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        <div class="footer">
          Document généré automatiquement par TruckTrack • ${currentDate}
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

// Fonction utilitaire pour ajuster la luminosité d'une couleur hexadécimale
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}


