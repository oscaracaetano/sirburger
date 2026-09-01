'use client'

import { useState } from 'react'
import Link from 'next/link'

export interface BusinessHourItem {
  id: string
  dayOfWeek: number
  openTime: string
  closeTime: string
  isClosed: boolean
}

const DAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

const DAY_EMOJIS = ['☀️', '💼', '💼', '💼', '💼', '🎉', '🎉']

export function BusinessHoursConfigView({
  initialHours,
}: {
  initialHours: BusinessHourItem[]
}) {
  // Ensure we have all 7 days (0 to 6) in state
  const [hours, setHours] = useState<BusinessHourItem[]>(() => {
    const daysMap = new Map(initialHours.map((h) => [h.dayOfWeek, h]))
    const fullWeek: BusinessHourItem[] = []
    for (let day = 0; day < 7; day++) {
      if (daysMap.has(day)) {
        fullWeek.push(daysMap.get(day)!)
      } else {
        fullWeek.push({
          id: `day-${day}`,
          dayOfWeek: day,
          openTime: '19:00',
          closeTime: day === 5 || day === 6 ? '01:00' : '00:00',
          isClosed: false,
        })
      }
    }
    return fullWeek
  })

  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const handleToggleClosed = (dayOfWeek: number) => {
    setHours((prev) =>
      prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, isClosed: !h.isClosed } : h))
    )
    setFeedback(null)
  }

  const handleTimeChange = (
    dayOfWeek: number,
    field: 'openTime' | 'closeTime',
    value: string
  ) => {
    setHours((prev) =>
      prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h))
    )
    setFeedback(null)
  }

  const handleCopySchedule = (fromDay: number, targetDays: number[]) => {
    const source = hours.find((h) => h.dayOfWeek === fromDay)
    if (!source) return

    setHours((prev) =>
      prev.map((h) =>
        targetDays.includes(h.dayOfWeek)
          ? {
              ...h,
              openTime: source.openTime,
              closeTime: source.closeTime,
              isClosed: source.isClosed,
            }
          : h
      )
    )
    setFeedback({
      msg: `Se copió el horario de ${DAY_NAMES[fromDay]} a los días seleccionados. Recordá hacer clic en Guardar Cambios.`,
      type: 'success',
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/business-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar')
      }

      setFeedback({
        msg: '✅ ¡Horarios de atención actualizados y sincronizados con éxito!',
        type: 'success',
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar horarios'
      setFeedback({ msg: '❌ ' + message, type: 'error' })
    } finally {
      setIsSaving(false)
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
          Administrá los horarios de atención y la disponibilidad del local.
        </p>

        {/* Configuration Navigation Tabs */}
        <div className="flex gap-2 border-b border-gray-200 mt-4">
          <Link
            href="/admin/configuracion/productos"
            className="px-4 py-2.5 font-bold text-sm text-gray-500 hover:text-amber-700 hover:border-b-2 hover:border-amber-600 transition"
          >
            🍔 Menú y Agotados
          </Link>
          <Link
            href="/admin/configuracion/horarios"
            className="px-4 py-2.5 font-black text-sm text-amber-700 border-b-2 border-amber-600"
          >
            ⏰ Horarios de Atención
          </Link>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl font-bold text-sm flex items-center justify-between animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{feedback.msg}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-gray-600 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Business Hours Table / Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div>
            <h2 className="font-extrabold text-gray-900 text-base">
              Horarios Semanales de Apertura y Cierre (§29)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Fuera de estos horarios los clientes podrán ver el menú pero no podrán realizar pedidos.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-amber-600 hover:bg-amber-700 text-white font-black px-6 py-2.5 rounded-xl shadow-md transition transform active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {isSaving ? (
              <>
                <span className="animate-spin">⏳</span> Guardando...
              </>
            ) : (
              <>
                <span>💾</span> Guardar Cambios
              </>
            )}
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {hours.map((item) => {
            const dayName = DAY_NAMES[item.dayOfWeek]
            const dayEmoji = DAY_EMOJIS[item.dayOfWeek]
            const isWeekend = item.dayOfWeek === 0 || item.dayOfWeek === 5 || item.dayOfWeek === 6

            // Check if crosses midnight (closeTime < openTime)
            const isMidnightCrossing =
              !item.isClosed && item.closeTime && item.openTime && item.closeTime < item.openTime

            return (
              <div
                key={item.dayOfWeek}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                  item.isClosed ? 'bg-gray-50/60' : 'bg-white hover:bg-amber-50/20'
                }`}
              >
                {/* Day label and badge */}
                <div className="w-full sm:w-44 flex items-center justify-between sm:justify-start gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{dayEmoji}</span>
                    <div>
                      <span className="font-extrabold text-gray-900 text-base block">
                        {dayName}
                      </span>
                      <span className="text-[11px] text-gray-400 font-medium">
                        {isWeekend ? 'Fin de semana' : 'Día de semana'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleClosed(item.dayOfWeek)}
                    className={`sm:hidden text-xs font-bold px-3 py-1 rounded-full border transition ${
                      item.isClosed
                        ? 'bg-red-100 text-red-700 border-red-200'
                        : 'bg-green-100 text-green-700 border-green-200'
                    }`}
                  >
                    {item.isClosed ? '🔴 Cerrado' : '🟢 Abierto'}
                  </button>
                </div>

                {/* Open / Closed Switch and Time Pickers */}
                <div className="flex-1 flex flex-wrap items-center gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => handleToggleClosed(item.dayOfWeek)}
                    className={`hidden sm:inline-flex text-xs font-extrabold px-3 py-1.5 rounded-full border transition items-center gap-1.5 ${
                      item.isClosed
                        ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    <span>{item.isClosed ? 'Cerrado todo el día' : 'Abierto'}</span>
                  </button>

                  {!item.isClosed ? (
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">
                          Desde:
                        </label>
                        <input
                          type="time"
                          value={item.openTime}
                          onChange={(e) =>
                            handleTimeChange(item.dayOfWeek, 'openTime', e.target.value)
                          }
                          className="font-mono font-bold text-sm bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-1.5 text-gray-800 outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">
                          Hasta:
                        </label>
                        <input
                          type="time"
                          value={item.closeTime}
                          onChange={(e) =>
                            handleTimeChange(item.dayOfWeek, 'closeTime', e.target.value)
                          }
                          className="font-mono font-bold text-sm bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-1.5 text-gray-800 outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      {isMidnightCrossing && (
                        <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                          🌙 Cierra a la madrugada
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 font-medium italic">
                      El local permanecerá cerrado los {dayName}s.
                    </span>
                  )}
                </div>

                {/* Quick copy helpers */}
                <div className="text-right">
                  <div className="dropdown relative inline-block group">
                    <button
                      type="button"
                      className="text-xs text-gray-500 hover:text-amber-700 font-bold px-2 py-1 rounded hover:bg-gray-100 transition flex items-center gap-1"
                    >
                      <span>Copiar horario...</span>
                    </button>
                    <div className="hidden group-hover:block absolute right-0 z-20 w-48 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 space-y-1 text-left">
                      <button
                        type="button"
                        onClick={() => handleCopySchedule(item.dayOfWeek, [1, 2, 3, 4])}
                        className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-gray-700 font-medium transition"
                      >
                        A Lun - Jue (Semana)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopySchedule(item.dayOfWeek, [5, 6])}
                        className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-gray-700 font-medium transition"
                      >
                        A Vie - Sáb (Fin de semana)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopySchedule(item.dayOfWeek, [0, 1, 2, 3, 4, 5, 6])
                        }
                        className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-gray-700 font-bold transition border-t pt-1.5"
                      >
                        A toda la semana
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer save banner */}
        <div className="p-5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500 text-center sm:text-left">
            💡 Los cambios impactan inmediatamente en el cálculo de si el local está abierto o cerrado en la portada.
          </p>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-black px-8 py-3 rounded-xl shadow-md transition transform active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {isSaving ? 'Guardando cambios...' : 'Guardar Horarios Semanales'}
          </button>
        </div>
      </div>
    </div>
  )
}
