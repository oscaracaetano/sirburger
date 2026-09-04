'use client'

import { useState } from 'react'
import Link from 'next/link'

export interface PrinterConfigData {
  id: string
  driver: string
  connectionType: string
  printerName: string
  tcpHost: string | null
  tcpPort: number | null
  autoCut: boolean
  soundAlert: boolean
  copies: number
  ticketHeader: string
  active: boolean
}

export function PrinterConfigView({ initialConfig }: { initialConfig: PrinterConfigData }) {
  const [config, setConfig] = useState<PrinterConfigData>(initialConfig)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/admin/printer-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar la configuración')
      }

      setConfig(data)
      setFeedback({
        msg: '✅ Configuración de impresora guardada y sincronizada correctamente.',
        type: 'success',
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar'
      setFeedback({ msg: '❌ ' + message, type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestPrint = async () => {
    setIsTesting(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/printer/test', {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al solicitar prueba')
      }

      setFeedback({
        msg: '🖨️ ¡Ticket de prueba encolado con éxito! El agente local de cocina lo imprimirá en breve.',
        type: 'success',
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error en prueba'
      setFeedback({ msg: '❌ ' + message, type: 'error' })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header and Subtabs */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
          Configuración del Sistema
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestioná el menú, horarios, repartidores y la impresora de comandas de cocina.
        </p>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-gray-200 mt-4 overflow-x-auto">
          <Link
            href="/admin/configuracion/productos"
            className="px-4 py-2.5 font-bold text-sm text-gray-500 hover:text-amber-700 hover:border-b-2 hover:border-amber-600 transition whitespace-nowrap"
          >
            🍔 Menú y Agotados
          </Link>
          <Link
            href="/admin/configuracion/horarios"
            className="px-4 py-2.5 font-bold text-sm text-gray-500 hover:text-amber-700 hover:border-b-2 hover:border-amber-600 transition whitespace-nowrap"
          >
            ⏰ Horarios de Atención
          </Link>
          <Link
            href="/admin/configuracion/repartidores"
            className="px-4 py-2.5 font-bold text-sm text-gray-500 hover:text-amber-700 hover:border-b-2 hover:border-amber-600 transition whitespace-nowrap"
          >
            🛵 Repartidores
          </Link>
          <Link
            href="/admin/configuracion/impresora"
            className="px-4 py-2.5 font-black text-sm text-amber-700 border-b-2 border-amber-600 whitespace-nowrap"
          >
            🖨️ Impresora de Tickets
          </Link>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl font-bold text-sm flex items-center justify-between shadow-xs animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-900 border border-green-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <span>{feedback.msg}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-gray-600 font-bold text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Settings Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-gray-200 space-y-8">
        {/* Status Toggle & Test button header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <span>🖨️</span> Estación de Impresión de Cocina
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Configurá el modelo de impresora térmica y el método de emisión de comandas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.active}
                onChange={(e) => setConfig({ ...config, active: e.target.checked })}
                className="w-4 h-4 rounded text-amber-600 accent-amber-600"
              />
              <span className="text-xs font-bold text-gray-800">
                {config.active ? '🟢 Servicio Activo' : '🔴 Servicio Pausado'}
              </span>
            </label>

            <button
              type="button"
              onClick={handleTestPrint}
              disabled={isTesting || !config.active}
              className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-black text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>{isTesting ? '⏳' : '⚡'}</span>
              <span>Probar Ticket</span>
            </button>
          </div>
        </div>

        {/* 1. Driver / Hardware Selection */}
        <div className="space-y-3">
          <label className="block text-xs font-black uppercase tracking-wider text-gray-700">
            1. Modelo y Lenguaje de la Impresora:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Zebra GC420t */}
            <div
              onClick={() =>
                setConfig({
                  ...config,
                  driver: 'ZEBRA_ZPL',
                  autoCut: false,
                  printerName: config.printerName || 'Zebra GC420t',
                })
              }
              className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                config.driver === 'ZEBRA_ZPL'
                  ? 'border-amber-600 bg-amber-50/60 shadow-xs'
                  : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl">🦓</span>
                  {config.driver === 'ZEBRA_ZPL' && (
                    <span className="text-xs bg-amber-600 text-white font-black px-2 py-0.5 rounded-full">
                      ACTIVA
                    </span>
                  )}
                </div>
                <h3 className="font-black text-gray-900 text-sm">Zebra GC420t (ZPL)</h3>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  Impresora térmica de etiquetas/rollos con lenguaje <strong>ZPL nativo</strong> y códigos de barra de máxima nitidez.
                </p>
              </div>
              <span className="text-[10px] font-bold text-gray-400 mt-3 block">
                Corte manual contra barra dentada
              </span>
            </div>

            {/* Unnion TP85 / TP95 (80mm) */}
            <div
              onClick={() =>
                setConfig({
                  ...config,
                  driver: 'ESCPOS_80MM',
                  autoCut: true,
                  printerName: config.printerName === 'Zebra GC420t' ? 'Unnion TP85' : config.printerName,
                })
              }
              className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                config.driver === 'ESCPOS_80MM'
                  ? 'border-amber-600 bg-amber-50/60 shadow-xs'
                  : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl">🧾</span>
                  {config.driver === 'ESCPOS_80MM' && (
                    <span className="text-xs bg-amber-600 text-white font-black px-2 py-0.5 rounded-full">
                      ACTIVA
                    </span>
                  )}
                </div>
                <h3 className="font-black text-gray-900 text-sm">Comandera 80 mm (ESC/POS)</h3>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  Ideal para <strong>Unnion TP85 / TP95 Cube</strong>. Ancho estándar gastronómico con soporte de <strong>corte automático</strong>.
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 mt-3 block">
                ✓ Con corte automático de guillotina
              </span>
            </div>

            {/* XL-SCAN / Generic 58mm */}
            <div
              onClick={() =>
                setConfig({
                  ...config,
                  driver: 'ESCPOS_58MM',
                  autoCut: true,
                  printerName: config.printerName === 'Zebra GC420t' ? 'POS-58' : config.printerName,
                })
              }
              className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                config.driver === 'ESCPOS_58MM'
                  ? 'border-amber-600 bg-amber-50/60 shadow-xs'
                  : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl">📄</span>
                  {config.driver === 'ESCPOS_58MM' && (
                    <span className="text-xs bg-amber-600 text-white font-black px-2 py-0.5 rounded-full">
                      ACTIVA
                    </span>
                  )}
                </div>
                <h3 className="font-black text-gray-900 text-sm">Comandera 58 mm (ESC/POS)</h3>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  Para <strong>XL-SCAN RP5850</strong> u otras comanderas angostas de 58 mm. Formato compacto de texto.
                </p>
              </div>
              <span className="text-[10px] font-bold text-gray-400 mt-3 block">
                Formato reducido
              </span>
            </div>
          </div>
        </div>

        {/* 2. Connection Type */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <label className="block text-xs font-black uppercase tracking-wider text-gray-700">
            2. Método de Conexión Física:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                config.connectionType === 'USB_WINDOWS'
                  ? 'border-amber-600 bg-amber-50/40 font-bold text-gray-900'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="connectionType"
                  value="USB_WINDOWS"
                  checked={config.connectionType === 'USB_WINDOWS'}
                  onChange={(e) => setConfig({ ...config, connectionType: e.target.value })}
                  className="accent-amber-600"
                />
                <div>
                  <div className="text-sm font-black">🔌 USB / Cola de Windows</div>
                  <div className="text-xs text-gray-500 font-normal">
                    Conectada por cable a la PC fija de cocina.
                  </div>
                </div>
              </div>
            </label>

            <label
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                config.connectionType === 'NETWORK_TCP'
                  ? 'border-amber-600 bg-amber-50/40 font-bold text-gray-900'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="connectionType"
                  value="NETWORK_TCP"
                  checked={config.connectionType === 'NETWORK_TCP'}
                  onChange={(e) => setConfig({ ...config, connectionType: e.target.value })}
                  className="accent-amber-600"
                />
                <div>
                  <div className="text-sm font-black">📶 Red Local / Wi-Fi (Socket TCP)</div>
                  <div className="text-xs text-gray-500 font-normal">
                    Para modelos inalámbricos como Unnion TP95 Cube (IP directa).
                  </div>
                </div>
              </div>
            </label>
          </div>

          {/* Connection Details Inputs */}
          {config.connectionType === 'USB_WINDOWS' ? (
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2 mt-2">
              <label className="block text-xs font-bold text-gray-700">
                Nombre de la impresora instalada en Windows:
              </label>
              <input
                type="text"
                value={config.printerName}
                onChange={(e) => setConfig({ ...config, printerName: e.target.value })}
                placeholder="Ej: Zebra GC420t o ZDesigner GC420t"
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-gray-400">
                Debe coincidir con el nombre que figura en <em>Configuración &gt; Impresoras</em> de Windows en la PC de cocina.
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Dirección IP de la Impresora en la Red:
                </label>
                <input
                  type="text"
                  value={config.tcpHost || ''}
                  onChange={(e) => setConfig({ ...config, tcpHost: e.target.value })}
                  placeholder="Ej: 192.168.1.150"
                  className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Puerto TCP Raw:
                </label>
                <input
                  type="number"
                  value={config.tcpPort || 9100}
                  onChange={(e) =>
                    setConfig({ ...config, tcpPort: parseInt(e.target.value, 10) || 9100 })
                  }
                  placeholder="9100"
                  className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Printing Options and Switches */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <label className="block text-xs font-black uppercase tracking-wider text-gray-700">
            3. Opciones de Impresión y Avisos en Cocina:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Auto Cut */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-gray-800 block">
                  ✂️ Corte Automático
                </span>
                <span className="text-[10px] text-gray-400">Guillotina al terminar</span>
              </div>
              <input
                type="checkbox"
                checked={config.autoCut}
                onChange={(e) => setConfig({ ...config, autoCut: e.target.checked })}
                className="w-4 h-4 rounded text-amber-600 accent-amber-600 cursor-pointer"
              />
            </div>

            {/* Sound Alerts */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-gray-800 block">
                  🔊 Avisos Sonoros
                </span>
                <span className="text-[10px] text-gray-400">Campana y bocina urgente</span>
              </div>
              <input
                type="checkbox"
                checked={config.soundAlert}
                onChange={(e) => setConfig({ ...config, soundAlert: e.target.checked })}
                className="w-4 h-4 rounded text-amber-600 accent-amber-600 cursor-pointer"
              />
            </div>

            {/* Copies */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-gray-800 block">
                  📄 Copias por Pedido
                </span>
                <span className="text-[10px] text-gray-400">Tickets impresos</span>
              </div>
              <select
                value={config.copies}
                onChange={(e) =>
                  setConfig({ ...config, copies: parseInt(e.target.value, 10) || 1 })
                }
                className="bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs font-black text-gray-900 outline-none"
              >
                <option value={1}>1 copia</option>
                <option value={2}>2 copias</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-black text-sm px-8 py-3.5 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 active:scale-98 flex items-center justify-center gap-2"
          >
            <span>💾</span>
            <span>{isSaving ? 'Guardando...' : 'Guardar Configuración de Impresión'}</span>
          </button>
        </div>
      </div>

      {/* Guide Card: How to run the local agent on the kitchen PC */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-3xl p-6 sm:p-7 shadow-md space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">⚡</span>
          <h3 className="text-base font-black">
            ¿Cómo conectar la PC de Cocina con la Impresora?
          </h3>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">
          En la máquina fija de cocina tenés la carpeta <code className="bg-gray-700 px-1.5 py-0.5 rounded text-amber-300">kitchen-print-agent</code> lista para usar:
        </p>
        <ol className="text-xs text-gray-300 space-y-1.5 list-decimal list-inside bg-black/30 p-3.5 rounded-xl border border-gray-700/60">
          <li>
            Hacé doble clic en <strong>iniciar-agente.bat</strong> en la estación de cocina.
          </li>
          <li>
            El agente quedará corriendo en segundo plano: cuando una orden pase a cocina, imprimirá el ticket al instante y sonará el aviso por los parlantes.
          </li>
          <li>
            Si más adelante cambiás la Zebra por una Unnion o XL-Scan, solo cambiás la opción arriba en este panel y guardás. ¡Listo!
          </li>
        </ol>
      </div>
    </div>
  )
}
