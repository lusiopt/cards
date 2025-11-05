import { parseCSV, ParsedRow } from './csv'
import { parseXLSX } from './xlsx'
import { parsePDF } from './pdf'

export type { ParsedRow }

export async function parseFile(file: File): Promise<ParsedRow[]> {
  const fileType = file.type
  const fileName = file.name.toLowerCase()

  // CSV
  if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
    return parseCSV(file)
  }

  // XLSX/XLS
  if (
    fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    fileType === 'application/vnd.ms-excel' ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls')
  ) {
    return parseXLSX(file)
  }

  // PDF
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer()
    return parsePDF(arrayBuffer)
  }

  throw new Error('Formato de arquivo não suportado. Use CSV, XLSX ou PDF.')
}

// Detectar colunas automaticamente
export function detectColumns(rows: ParsedRow[]): {
  dateColumn?: string
  merchantColumn?: string
  descriptionColumn?: string
  amountColumn?: string
  currencyColumn?: string
} {
  if (rows.length === 0) return {}

  const firstRow = rows[0]
  const columns = Object.keys(firstRow)

  const detected = {
    dateColumn: undefined as string | undefined,
    merchantColumn: undefined as string | undefined,
    descriptionColumn: undefined as string | undefined,
    amountColumn: undefined as string | undefined,
    currencyColumn: undefined as string | undefined,
  }

  // Buscar por padrões conhecidos nos nomes das colunas
  for (const col of columns) {
    const lower = col.toLowerCase()

    // Data
    if (!detected.dateColumn && (
      lower.includes('date') ||
      lower.includes('data') ||
      lower.includes('transaction date') ||
      lower.includes('posting date')
    )) {
      detected.dateColumn = col
    }

    // Merchant
    if (!detected.merchantColumn && (
      lower.includes('merchant') ||
      lower.includes('description') ||
      lower.includes('name') ||
      lower.includes('estabelecimento')
    )) {
      detected.merchantColumn = col
    }

    // Amount
    if (!detected.amountColumn && (
      lower.includes('amount') ||
      lower.includes('valor') ||
      lower.includes('value') ||
      lower.includes('total')
    )) {
      detected.amountColumn = col
    }

    // Currency
    if (!detected.currencyColumn && (
      lower.includes('currency') ||
      lower.includes('moeda')
    )) {
      detected.currencyColumn = col
    }
  }

  // Description como fallback do merchant
  if (!detected.descriptionColumn) {
    for (const col of columns) {
      const lower = col.toLowerCase()
      if (lower.includes('desc') || lower.includes('memo') || lower.includes('note')) {
        detected.descriptionColumn = col
        break
      }
    }
  }

  return detected
}
