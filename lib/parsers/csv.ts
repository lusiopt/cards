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
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as ParsedRow[])
      },
      error: (error) => {
        reject(error)
      }
    })
  })
}
