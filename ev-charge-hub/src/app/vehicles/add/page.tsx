'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast, { useToast } from '@/components/Toast'

const popularEVModels = [
    { make: 'Tesla', models: ['Model 3', 'Model Y', 'Model S', 'Model X'] },
    { make: 'Tata', models: ['Nexon EV', 'Tiago EV', 'Punch EV', 'Tigor EV'] },
    { make: 'MG', models: ['ZS EV', 'Comet EV'] },
    { make: 'Mahindra', models: ['XUV400', 'BE 6e', 'XEV 9e'] },
    { make: 'Hyundai', models: ['Ioniq 5', 'Kona Electric'] },
    { make: 'Kia', models: ['EV6', 'EV9'] },
    { make: 'BYD', models: ['Atto 3', 'Seal', 'eMAX 7'] },
    { make: 'Mercedes-Benz', models: ['EQS', 'EQE', 'EQB'] },
    { make: 'BMW', models: ['i4', 'iX', 'i7'] },
    { make: 'Audi', models: ['e-tron GT', 'Q8 e-tron', 'Q4 e-tron'] },
    { make: 'Porsche', models: ['Taycan', 'Macan Electric'] },
    { make: 'Other', models: ['Custom'] },
]

const batteryCapacities: { [key: string]: number } = {
    'Model 3': 75,
    'Model Y': 75,
    'Model S': 100,
    'Model X': 100,
    'Nexon EV': 40.5,
    'Tiago EV': 24,
    'Punch EV': 35,
    'Tigor EV': 26,
    'ZS EV': 50.3,
    'Comet EV': 17.3,
    'XUV400': 39.4,
    'BE 6e': 79,
    'XEV 9e': 79,
    'Ioniq 5': 72.6,
    'Kona Electric': 64,
    'EV6': 77.4,
    'EV9': 99.8,
    'Atto 3': 60.48,
    'Seal': 82.56,
    'eMAX 7': 71.8,
    'EQS': 107.8,
    'EQE': 90.6,
    'EQB': 66.5,
    'i4': 83.9,
    'iX': 111.5,
    'i7': 101.7,
    'e-tron GT': 93.4,
    'Q8 e-tron': 114,
    'Q4 e-tron': 82,
    'Taycan': 93.4,
    'Macan Electric': 100,
}

export default function AddVehiclePage() {
    const router = useRouter()
    const { toast, showToast, hideToast } = useToast()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        make: '',
        model: '',
        year: new Date().getFullYear(),
        licensePlate: '',
        batteryCapacity: 50,
    })

    const selectedMake = popularEVModels.find(m => m.make === formData.make)
    const availableModels = selectedMake?.models || []

    const handleMakeChange = (make: string) => {
        setFormData({
            ...formData,
            make,
            model: '',
            batteryCapacity: 50,
        })
    }

    const handleModelChange = (model: string) => {
        const capacity = batteryCapacities[model] || 50
        setFormData({
            ...formData,
            model,
            batteryCapacity: capacity,
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch('/api/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            const data = await res.json()

            if (!res.ok) {
                showToast(data.error || 'Failed to add vehicle', 'error')
                return
            }

            showToast('Vehicle registered successfully!', 'success')
            setTimeout(() => router.push('/vehicles'), 1000)
        } catch {
            showToast('Something went wrong', 'error')
        } finally {
            setLoading(false)
        }
    }

    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 15 }, (_, i) => currentYear - i)

    return (
        <div className="min-h-screen">
            {/* Background gradient effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#00d4aa]/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#6366f1]/10 rounded-full blur-3xl" />
            </div>

            <div className="max-w-2xl mx-auto px-4 py-12">
                {/* Back Link */}
                <Link
                    href="/vehicles"
                    className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] mb-8"
                >
                    ← Back to Vehicles
                </Link>

                {/* Form Card */}
                <div className="glass-card p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#00d4aa]/20 to-[#00a883]/20 flex items-center justify-center text-4xl mb-4">
                            🚗
                        </div>
                        <h1 className="text-2xl font-bold">Register Your EV</h1>
                        <p className="text-[var(--muted)] mt-2">Add your electric vehicle to start booking charging slots</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Make */}
                        <div>
                            <label htmlFor="make" className="form-label">Vehicle Make</label>
                            <select
                                id="make"
                                className="form-select"
                                value={formData.make}
                                onChange={(e) => handleMakeChange(e.target.value)}
                                required
                            >
                                <option value="">Select Make</option>
                                {popularEVModels.map((m) => (
                                    <option key={m.make} value={m.make}>{m.make}</option>
                                ))}
                            </select>
                        </div>

                        {/* Model */}
                        <div>
                            <label htmlFor="model" className="form-label">Model</label>
                            {formData.make === 'Other' ? (
                                <input
                                    id="model"
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter model name"
                                    value={formData.model}
                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                    required
                                />
                            ) : (
                                <select
                                    id="model"
                                    className="form-select"
                                    value={formData.model}
                                    onChange={(e) => handleModelChange(e.target.value)}
                                    disabled={!formData.make}
                                    required
                                >
                                    <option value="">Select Model</option>
                                    {availableModels.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Year */}
                        <div>
                            <label htmlFor="year" className="form-label">Year</label>
                            <select
                                id="year"
                                className="form-select"
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                required
                            >
                                {years.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        {/* License Plate */}
                        <div>
                            <label htmlFor="licensePlate" className="form-label">License Plate Number</label>
                            <input
                                id="licensePlate"
                                type="text"
                                className="form-input"
                                placeholder="MH01AB1234"
                                value={formData.licensePlate}
                                onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                                required
                                style={{ textTransform: 'uppercase' }}
                            />
                        </div>

                        {/* Battery Capacity */}
                        <div>
                            <label htmlFor="batteryCapacity" className="form-label">Battery Capacity (kWh)</label>
                            <input
                                id="batteryCapacity"
                                type="number"
                                className="form-input"
                                placeholder="75"
                                value={formData.batteryCapacity}
                                onChange={(e) => setFormData({ ...formData, batteryCapacity: parseFloat(e.target.value) })}
                                required
                                min="10"
                                max="200"
                                step="0.1"
                            />
                            <p className="text-xs text-[var(--muted)] mt-1">
                                {formData.model && batteryCapacities[formData.model]
                                    ? `Auto-filled based on ${formData.model} specifications`
                                    : 'Enter your vehicle\'s battery capacity'}
                            </p>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="btn-primary w-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Registering...
                                </span>
                            ) : (
                                'Register Vehicle'
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
        </div>
    )
}
