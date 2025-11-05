/**
 * Parser simplificado para PDF
 * Apenas retorna indicação de que é um PDF
 * A extração real será feita pela IA no extractor.ts
 */
export async function parsePDF(fileBuffer: ArrayBuffer): Promise<any[]> {
  // Retornar estrutura indicando que é PDF
  // A IA vai processar diretamente o PDF via document type
  return [{
    _isPDF: true,
    _buffer: fileBuffer,
    _note: 'PDF file - will be processed by AI extractor'
  }]
}
