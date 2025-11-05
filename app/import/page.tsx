'use client'

import { useState } from 'react'
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
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      setResult(data)
    } catch (error) {
      setResult({ error: 'Erro ao importar arquivo' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Importar Extrato</h2>
        <p className="text-gray-600 mt-2">
          Faça upload do seu extrato em CSV, XLSX ou PDF
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Arquivo</CardTitle>
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
              <p className="mt-2 text-sm text-gray-600">
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
                  <p className="font-semibold">Importação concluída!</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {result.imported} transações importadas e classificadas automaticamente
                  </p>
                  {result.errors > 0 && (
                    <p className="text-sm text-yellow-600 mt-1">
                      {result.errors} linhas com erro
                    </p>
                  )}
                  <a
                    href="/transactions"
                    className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                  >
                    Ver transações →
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Erro na importação</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {result.error || 'Erro desconhecido'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
