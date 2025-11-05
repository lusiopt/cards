import Papa from 'papaparse'

export interface ParsedRow {
  date?: string
  merchant?: string
  description?: string
  amount?: string
  currency?: string
  [key: string]: any
}

export async function parseCSV(file: File): Promise<ParsedRow[]> {
  // Ler o arquivo como texto
  const text = await file.text()

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as ParsedRow[])
      },
      error: (error: Error) => {
        reject(error)
      }
    })
  })
}
