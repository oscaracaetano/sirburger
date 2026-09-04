'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { generateWhatsAppLink } from '@/lib/whatsapp'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export interface CourierItem {
  id: string
  name: string
  cardCode: string
  phone: string | null
  vehicle: string | null
  plate: string | null
  company: string | null
  photoUrl: string | null
  active: boolean
  createdAt: string
}

const COMPANY_LABELS: Record<string, { label: string; color: string }> = {
  PROPIO: { label: '🛵 Propio', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  PEDIDOS_YA: { label: '🔴 PedidosYa', color: 'bg-red-100 text-red-800 border-red-200' },
  RAPPI: { label: '🟠 Rappi', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  AUTONOMO: { label: '🔵 Autónomo', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  OTRO: { label: '⚪ Otro', color: 'bg-gray-100 text-gray-800 border-gray-200' },
}

export function CouriersConfigView({ initialCouriers }: { initialCouriers: CourierItem[] }) {
  const { data: couriers = initialCouriers, mutate } = useSWR<CourierItem[]>(
    '/api/admin/couriers',
    fetcher,
    { fallbackData: initialCouriers }
  )

  const [isEditingCourier, setIsEditingCourier] = useState<CourierItem | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [printingCourier, setPrintingCourier] = useState<CourierItem | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form State
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formCardCode, setFormCardCode] = useState('')
  const [formVehicle, setFormVehicle] = useState('Moto')
  const [formPlate, setFormPlate] = useState('')
  const [formCompany, setFormCompany] = useState('PROPIO')
  const [formPhotoUrl, setFormPhotoUrl] = useState('')
  const [formActive, setFormActive] = useState(true)

  const handleOpenCreateModal = () => {
    const nextNum = couriers.length + 1
    setFormName('')
    setFormPhone('')
    setFormCardCode(`REP-${String(nextNum).padStart(3, '0')}`)
    setFormVehicle('Moto')
    setFormPlate('')
    setFormCompany('PROPIO')
    setFormPhotoUrl('')
    setFormActive(true)
    setIsCreatingNew(true)
    setIsEditingCourier(null)
  }

  const handleOpenEditModal = (courier: CourierItem) => {
    setFormName(courier.name)
    setFormPhone(courier.phone || '')
    setFormCardCode(courier.cardCode)
    setFormVehicle(courier.vehicle || '')
    setFormPlate(courier.plate || '')
    setFormCompany(courier.company || 'PROPIO')
    setFormPhotoUrl(courier.photoUrl || '')
    setFormActive(courier.active)
    setIsEditingCourier(courier)
    setIsCreatingNew(false)
  }

  const handleToggleActive = async (courier: CourierItem) => {
    try {
      const res = await fetch(`/api/admin/couriers/${courier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !courier.active }),
      })
      if (!res.ok) throw new Error('Error al actualizar estado')
      await mutate()
    } catch (err) {
      alert('Error: ' + err)
    }
  }

  const handleGenerateNewCard = async (courier: CourierItem) => {
    const newCode = `REP-${Math.floor(100 + Math.random() * 900)}`
    if (confirm(`¿Asignar nueva tarjeta ${newCode} a ${courier.name}?`)) {
      try {
        const res = await fetch(`/api/admin/couriers/${courier.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardCode: newCode }),
        })
        if (!res.ok) throw new Error('Error al actualizar tarjeta')
        await mutate()
      } catch (err) {
        alert('Error: ' + err)
      }
    }
  }

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      alert('El nombre es obligatorio.')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        name: formName.trim(),
        phone: formPhone.trim() || null,
        cardCode: formCardCode.trim(),
        vehicle: formVehicle.trim() || null,
        plate: formPlate.trim() || null,
        company: formCompany,
        photoUrl: formPhotoUrl.trim() || null,
        active: formActive,
      }

      let res: Response
      if (isCreatingNew) {
        res = await fetch('/api/admin/couriers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else if (isEditingCourier) {
        res = await fetch(`/api/admin/couriers/${isEditingCourier.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        return
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')

      setIsCreatingNew(false)
      setIsEditingCourier(null)
      await mutate()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error'
      alert('Error: ' + message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header and Subtabs */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
              Configuración del Sistema
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Fichas de repartidores, tarjetas de escaneo para despacho y datos de contacto.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="bg-amber-600 hover:bg-amber-700 text-white font-black px-5 py-2.5 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            <span>➕</span> Nuevo Repartidor
          </button>
        </div>

        {/* Configuration Navigation Subtabs */}
        <div className="flex gap-2 border-b border-gray-200 mt-5">
          <Link
            href="/admin/configuracion/productos"
            className="px-4 py-2.5 font-bold text-sm text-gray-500 hover:text-amber-700 hover:border-b-2 hover:border-amber-600 transition"
          >
            🍔 Menú y Agotados
          </Link>
          <Link
            href="/admin/configuracion/horarios"
            className="px-4 py-2.5 font-bold text-sm text-gray-500 hover:text-amber-700 hover:border-b-2 hover:border-amber-600 transition"
          >
            ⏰ Horarios de Atención
          </Link>
          <Link
            href="/admin/configuracion/repartidores"
            className="px-4 py-2.5 font-black text-sm text-amber-700 border-b-2 border-amber-600"
          >
            🛵 Repartidores
          </Link>
          <Link
            href="/admin/configuracion/impresora"
            className="px-4 py-2.5 font-bold text-sm text-gray-500 hover:text-amber-700 hover:border-b-2 hover:border-amber-600 transition"
          >
            🖨️ Impresora de Tickets
          </Link>
        </div>
      </div>

      {/* Couriers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {couriers.map((courier) => {
          const companyBadge = COMPANY_LABELS[courier.company || 'PROPIO'] || COMPANY_LABELS.PROPIO
          const waLink = courier.phone
            ? generateWhatsAppLink(courier.phone, `Hola ${courier.name}, te contactamos de SirBurger.`)
            : null

          return (
            <div
              key={courier.id}
              className={`bg-white rounded-3xl border p-5 sm:p-6 shadow-xs transition space-y-4 flex flex-col justify-between ${
                courier.active ? 'border-gray-200 hover:shadow-md' : 'border-gray-200 bg-gray-50/70 opacity-75'
              }`}
            >
              {/* Top Row: Avatar, Name, Company Badge and Active switch */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {courier.photoUrl ? (
                    <img
                      src={courier.photoUrl}
                      alt={courier.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-200 shadow-xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-900 font-black text-2xl flex items-center justify-center border-2 border-amber-200 shadow-xs">
                      🛵
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-gray-900 text-lg">{courier.name}</h3>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${companyBadge.color}`}>
                        {companyBadge.label}
                      </span>
                    </div>

                    {courier.phone ? (
                      <p className="text-xs text-gray-600 font-semibold mt-0.5 flex items-center gap-1">
                        <span>📞 {courier.phone}</span>
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-700 font-bold ml-1"
                          >
                            (WhatsApp)
                          </a>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">Sin teléfono</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleActive(courier)}
                  className={`text-xs font-bold px-3 py-1 rounded-full border transition cursor-pointer ${
                    courier.active
                      ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                      : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
                  }`}
                  title="Cambiar estado activo/inactivo"
                >
                  {courier.active ? '🟢 Activo' : '🔴 Inactivo'}
                </button>
              </div>

              {/* Middle Row: Vehicle, Plate and Card Code */}
              <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 text-xs space-y-2">
                <div className="flex justify-between items-center text-gray-700">
                  <span className="font-semibold text-gray-500">Vehículo:</span>
                  <span className="font-bold">{courier.vehicle || 'No especificado'}</span>
                </div>

                <div className="flex justify-between items-center text-gray-700">
                  <span className="font-semibold text-gray-500">Matrícula / Patente:</span>
                  <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-gray-200">
                    {courier.plate || 'S/D'}
                  </span>
                </div>

                {/* Card Code Barcode Preview */}
                <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="font-semibold text-gray-500">Tarjeta de Despacho:</span>
                  <div className="text-right">
                    <span className="font-mono font-black text-sm bg-gray-900 text-amber-400 px-2.5 py-0.5 rounded-lg">
                      {courier.cardCode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPrintingCourier(courier)}
                  className="bg-gray-900 hover:bg-gray-800 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span>🪪</span> Imprimir Tarjeta
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateNewCard(courier)}
                    className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-bold text-xs px-2.5 py-2 rounded-xl transition cursor-pointer"
                    title="Asignar un nuevo código de tarjeta"
                  >
                    <span>🔄</span> Nueva Tarjeta
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(courier)}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    <span>✏️</span> Editar
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal: Create or Edit Courier */}
      {(isCreatingNew || isEditingCourier) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveForm}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <span>🛵</span> {isCreatingNew ? 'Nuevo Repartidor' : `Editar Ficha: ${isEditingCourier?.name}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNew(false)
                  setIsEditingCourier(null)
                }}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5 text-xs font-bold text-gray-700">
              <div>
                <label className="block uppercase tracking-wider text-gray-500 mb-1">
                  Nombre y Apellido <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase tracking-wider text-gray-500 mb-1">
                    Teléfono Celular / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Ej: 091 090 705"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-gray-500 mb-1">
                    Empresa / Modalidad
                  </label>
                  <select
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="PROPIO">🛵 Repartidor Propio</option>
                    <option value="PEDIDOS_YA">🔴 PedidosYa</option>
                    <option value="RAPPI">🟠 Rappi</option>
                    <option value="AUTONOMO">🔵 Autónomo / Freelance</option>
                    <option value="OTRO">⚪ Otro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase tracking-wider text-gray-500 mb-1">
                    Vehículo
                  </label>
                  <input
                    type="text"
                    value={formVehicle}
                    onChange={(e) => setFormVehicle(e.target.value)}
                    placeholder="Ej: Moto 125cc / Bicicleta"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-gray-500 mb-1">
                    Matrícula / Patente
                  </label>
                  <input
                    type="text"
                    value={formPlate}
                    onChange={(e) => setFormPlate(e.target.value)}
                    placeholder="Ej: SBA 1234"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase tracking-wider text-gray-500 mb-1">
                    Código de Tarjeta (Escáner) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCardCode}
                    onChange={(e) => setFormCardCode(e.target.value)}
                    placeholder="Ej: REP-001"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-mono font-black text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider text-gray-500 mb-1">
                    Estado
                  </label>
                  <select
                    value={formActive ? '1' : '0'}
                    onChange={(e) => setFormActive(e.target.value === '1')}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="1">🟢 Activo para despachos</option>
                    <option value="0">🔴 Inactivo / Pausado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block uppercase tracking-wider text-gray-500 mb-1">
                  URL de Foto / Avatar (Opcional)
                </label>
                <input
                  type="url"
                  value={formPhotoUrl}
                  onChange={(e) => setFormPhotoUrl(e.target.value)}
                  placeholder="Ej: https://.../foto.jpg o /img/repartidor.jpg"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNew(false)
                  setIsEditingCourier(null)
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black py-2.5 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Guardando...' : 'Guardar Ficha'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Printable ID Card Badge */}
      {printingCourier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200 space-y-5 text-center">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider">
                Credencial de Reparto
              </span>
              <button
                onClick={() => setPrintingCourier(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Printable Card Container */}
            <div id="printable-courier-card" className="bg-gradient-to-b from-amber-500 to-amber-600 p-1 rounded-3xl shadow-lg text-gray-900">
              <div className="bg-white rounded-[22px] p-5 space-y-3">
                {/* Brand Header */}
                <div className="border-b border-gray-100 pb-2">
                  <h4 className="text-lg font-black text-amber-700 tracking-tight">
                    🍔 SIRBURGER DELIVERY
                  </h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Credencial Oficial de Reparto
                  </p>
                </div>

                {/* Avatar & Name */}
                <div className="flex flex-col items-center">
                  {printingCourier.photoUrl ? (
                    <img
                      src={printingCourier.photoUrl}
                      alt={printingCourier.name}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-500 shadow-md mb-2"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-amber-100 text-amber-900 font-black text-3xl flex items-center justify-center border-2 border-amber-400 shadow-xs mb-2">
                      🛵
                    </div>
                  )}
                  <h3 className="text-xl font-black text-gray-900">{printingCourier.name}</h3>
                  <span className="text-xs font-bold text-gray-500 mt-0.5">
                    {printingCourier.vehicle || 'Repartidor'} · {printingCourier.plate || 'S/D'}
                  </span>
                </div>

                {/* Large Barcode for Scanning Pistol */}
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-1">
                  <div className="flex justify-center items-center h-12">
                    {/* Simulated high-contrast Code128 barcode lines */}
                    <div className="flex items-center gap-[2px] h-10 overflow-hidden px-2">
                      {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3].map(
                        (w, i) => (
                          <div
                            key={i}
                            className="bg-gray-950 h-full"
                            style={{ width: `${w * 2}px` }}
                          />
                        )
                      )}
                    </div>
                  </div>
                  <p className="font-mono font-black text-base tracking-widest text-gray-900">
                    *{printingCourier.cardCode}*
                  </p>
                </div>

                <p className="text-[10px] text-gray-400 font-medium">
                  Escanear esta tarjeta en la estación de despacho para asignar pedidos.
                </p>
              </div>
            </div>

            {/* Print button */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPrintingCourier(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-black py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <span>🖨️</span> Imprimir Tarjeta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
