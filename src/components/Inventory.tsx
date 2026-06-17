import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { euro, productShuttleCount } from '../lib/calc'
import type { Product } from '../types'
import { Card } from './Card'
import { Button } from './Button'
import { Modal } from './Modal'
import { Field } from './Field'

export function Inventory() {
  const { state, addProduct, updateProduct, restockProduct, deleteProduct } = useApp()
  const { isAuthenticated } = useAuth()

  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [restocking, setRestocking] = useState<Product | null>(null)

  return (
    <Card
      title="Inventory Left"
      icon="📦"
      accent="border-purple-500"
      action={
        isAuthenticated ? (
          <Button onClick={() => setEditing('new')}>+ Add product</Button>
        ) : undefined
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-3 font-medium">Product</th>
              <th className="py-2 pr-3 font-medium">€/barrel</th>
              <th className="py-2 pr-3 font-medium">Barrels</th>
              <th className="py-2 pr-3 font-medium">Loose</th>
              <th className="py-2 pr-3 font-medium">Total shuttles</th>
              {isAuthenticated && <th className="py-2 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {state.products.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 pr-3">
                  <span className="font-semibold text-slate-800">{p.brand}</span>{' '}
                  <span className="text-slate-500">{p.model}</span>
                </td>
                <td className="py-2 pr-3 text-slate-600">{euro(p.costPerBarrel)}</td>
                <td className="py-2 pr-3 text-slate-600">{p.barrels}</td>
                <td className="py-2 pr-3 text-slate-600">{p.looseShuttles}</td>
                <td className="py-2 pr-3 font-semibold text-slate-800">
                  {productShuttleCount(p)}
                </td>
                {isAuthenticated && (
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant="ghost"
                        className="px-2 py-1"
                        onClick={() => setRestocking(p)}
                      >
                        Restock
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-2 py-1"
                        onClick={() => setEditing(p)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-2 py-1 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (confirm(`Delete ${p.brand} ${p.model}?`)) deleteProduct(p.id)
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {state.products.length === 0 && (
              <tr>
                <td colSpan={6} className="py-3 text-slate-500">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductModal
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onAdd={(data) => {
            addProduct(data)
            setEditing(null)
          }}
          onUpdate={(id, data) => {
            updateProduct(id, data)
            setEditing(null)
          }}
        />
      )}

      {restocking && (
        <RestockModal
          product={restocking}
          onClose={() => setRestocking(null)}
          onSave={(barrels, unitCost, note) => {
            restockProduct(restocking.id, barrels, unitCost, note)
            setRestocking(null)
          }}
        />
      )}
    </Card>
  )
}

function ProductModal({
  product,
  onClose,
  onAdd,
  onUpdate,
}: {
  product: Product | null
  onClose: () => void
  onAdd: (data: {
    brand: string
    model: string
    shuttlesPerBarrel: number
    costPerBarrel: number
    barrels: number
  }) => void
  onUpdate: (
    id: string,
    data: {
      brand: string
      model: string
      shuttlesPerBarrel: number
      costPerBarrel: number
      barrels: number
      looseShuttles: number
    },
  ) => void
}) {
  const isEdit = product !== null
  const [brand, setBrand] = useState(product?.brand ?? '')
  const [model, setModel] = useState(product?.model ?? '')
  const [perBarrel, setPerBarrel] = useState(String(product?.shuttlesPerBarrel ?? 12))
  const [cost, setCost] = useState(String(product?.costPerBarrel ?? ''))
  const [barrels, setBarrels] = useState(String(product?.barrels ?? ''))
  const [loose, setLoose] = useState(String(product?.looseShuttles ?? 0))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!brand.trim() || !model.trim()) return
    if (isEdit) {
      onUpdate(product.id, {
        brand,
        model,
        shuttlesPerBarrel: Number(perBarrel) || 1,
        costPerBarrel: Number(cost) || 0,
        barrels: Number(barrels) || 0,
        looseShuttles: Number(loose) || 0,
      })
    } else {
      onAdd({
        brand,
        model,
        shuttlesPerBarrel: Number(perBarrel) || 1,
        costPerBarrel: Number(cost) || 0,
        barrels: Number(barrels) || 0,
      })
    }
  }

  return (
    <Modal open title={isEdit ? 'Edit product' : 'Add new product'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} autoFocus placeholder="e.g. Yonex" />
        <Field label="Model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. AS-30" />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Shuttles / barrel"
            type="number"
            min={1}
            value={perBarrel}
            onChange={(e) => setPerBarrel(e.target.value)}
          />
          <Field
            label="Cost / barrel (€)"
            type="number"
            min={0}
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={isEdit ? 'Barrels in stock' : 'Barrels to buy'}
            type="number"
            min={0}
            value={barrels}
            onChange={(e) => setBarrels(e.target.value)}
          />
          {isEdit && (
            <Field
              label="Loose shuttles"
              type="number"
              min={0}
              value={loose}
              onChange={(e) => setLoose(e.target.value)}
            />
          )}
        </div>
        <p className="text-xs text-slate-400">
          {isEdit
            ? 'Editing counts here is a stock correction and does not change the fund. Use “Restock” to buy more and update the fund.'
            : 'Adding a product records a purchase, so the fund will go down by barrels × cost.'}
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{isEdit ? 'Save changes' : 'Add product'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function RestockModal({
  product,
  onClose,
  onSave,
}: {
  product: Product
  onClose: () => void
  onSave: (barrels: number, unitCost: number, note?: string) => void
}) {
  const [barrels, setBarrels] = useState('')
  const [unitCost, setUnitCost] = useState(String(product.costPerBarrel))
  const [note, setNote] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (Number(barrels) <= 0) return
    onSave(Number(barrels), Number(unitCost) || 0, note)
  }

  return (
    <Modal open title={`Restock ${product.brand} ${product.model}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field
          label="Barrels to buy"
          type="number"
          min={1}
          value={barrels}
          onChange={(e) => setBarrels(e.target.value)}
          autoFocus
        />
        <Field
          label="Cost per barrel (€)"
          type="number"
          min={0}
          step="0.01"
          value={unitCost}
          onChange={(e) => setUnitCost(e.target.value)}
        />
        <Field
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. June restock"
        />
        <p className="text-xs text-slate-400">
          This records a purchase: the fund drops by barrels × cost and inventory goes up.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Restock</Button>
        </div>
      </form>
    </Modal>
  )
}
