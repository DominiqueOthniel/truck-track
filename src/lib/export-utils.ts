import * as XLSX from 'xlsx';

interface ExportColumn<T> {
  header: string;
  value: (row: T, index: number) => string | number | null | undefined;
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

export function exportToPrintablePDF<T>(options: ExportOptions<T>) {
  const { title, filtersDescription, columns, rows } = options;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const tableHeaders = columns
    .map((c) => `<th style="padding:8px;border:1px solid #e5e7eb;text-align:left;font-size:12px;">${c.header}</th>`)
    .join('');

  const tableRows = rows
    .map((row, index) => {
      const cells = columns
        .map((c) => {
          const value = c.value(row, index);
          return `<td style="padding:8px;border:1px solid #e5e7eb;font-size:12px;">${value ?? ''}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const filtersBlock = filtersDescription
    ? `<p style="margin:4px 0 16px 0;font-size:12px;color:#4b5563;">${filtersDescription}</p>`
    : '';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <title>${title}</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            padding: 24px;
            color: #111827;
          }
          h1 {
            font-size: 20px;
            margin-bottom: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          thead {
            background-color: #f9fafb;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${filtersBlock}
        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `);

  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}


