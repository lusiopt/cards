import * as XLSX from 'xlsx'
import { ParsedRow } from './csv'

export async function parseXLSX(file: File): Promise<ParsedRow[]> {
  // Ler o arquivo como ArrayBuffer
  const arrayBuffer = await file.arrayBuffer()

  // Ler o workbook
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })

  // Pegar a primeira sheet
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]

  // Converter para JSON
  const json = XLSX.utils.sheet_to_json(worksheet) as ParsedRow[]

  return json
}
