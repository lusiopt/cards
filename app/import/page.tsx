'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function handleImport() {
    if (!file) return

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('cardName', 'default')

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/import`, {
        method: 'POST',
        body: formData
      })

      // Verificar se a resposta é JSON
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Resposta inválida do servidor. Verifique se o arquivo está no formato correto.')
      }

      const data = await res.json()

      // Se o servidor retornou erro HTTP mas ainda é JSON
      if (!res.ok) {
        throw new Error(data.error || data.details || 'Erro ao processar arquivo')
      }

      setResult(data)
    } catch (error) {
      console.error('Import error:', error)
      setResult({
        success: false,
        error: 'Erro ao importar arquivo',
        details: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Importar Extrato</h2>
        <p className="text-gray-700 mt-2">
          Faça upload do seu extrato em CSV, XLSX ou PDF
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Selecionar Arquivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <Input
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="max-w-xs mx-auto"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-700">
                Arquivo: {file.name}
              </p>
            )}
          </div>

          <Button
            onClick={handleImport}
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? 'Processando...' : 'Importar e Classificar com IA'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="pt-6">
            {result.success ? (
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Importação concluída!</p>
                  <p className="text-sm text-gray-700 mt-1">
                    {result.imported} transações importadas e classificadas automaticamente
                  </p>
                  {result.errors > 0 && (
                    <p className="text-sm text-yellow-600 mt-1">
                      {result.errors} linhas com erro
                    </p>
                  )}
                  <Link
                    href="/transactions"
                    className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                  >
                    Ver transações →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{result.error || 'Erro na importação'}</p>
                  <p className="text-sm text-gray-700 mt-1">
                    {result.message || result.details || 'Erro ao importar arquivo'}
                  </p>
                  {result.details && (
                    <p className="text-xs text-gray-600 mt-2 font-mono bg-gray-50 p-2 rounded">
                      {result.details}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
