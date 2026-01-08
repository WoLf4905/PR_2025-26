'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Toast, { useToast } from '@/components/Toast'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Vehicle {
    id: string
    make: string
    model: string
    year: number
    licensePlate: string
    batteryCapacity: number
    createdAt: string
}

interface User {
    id: string
    name: string
    email: string
}

export default function VehiclesPage() {
    const router = useRouter()
    const { toast, showToast, hideToast } = useToast()
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => {
        fetchVehicles()
        fetchUser()
    }, [])

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/auth/me')
            if (res.ok) {
                const data = await res.json()
                setUser(data.user)
            }
        } catch (error) {
            console.error('Failed to fetch user:', error)
        }
    }

    const fetchVehicles = async () => {
        try {
            const res = await fetch('/api/vehicles')
            if (res.status === 401) {
                router.push('/login')
                return
            }
            const data = await res.json()
            setVehicles(data.vehicles || [])
        } catch (error) {
            console.error('Failed to fetch vehicles:', error)
            showToast('Failed to load vehicles', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this vehicle?')) return

        setDeletingId(id)
        try {
            const res = await fetch('/api/vehicles', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            })

            if (res.ok) {
                setVehicles(vehicles.filter(v => v.id !== id))
                showToast('Vehicle removed successfully', 'success')
            } else {
                const data = await res.json()
                showToast(data.error || 'Failed to remove vehicle', 'error')
            }
        } catch {
            showToast('Failed to remove vehicle', 'error')
        } finally {
            setDeletingId(null)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <Navbar userName={user?.name || 'User'} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">My Vehicles</h1>
                        <p className="text-[var(--muted)] mt-1">Manage your registered electric vehicles</p>
                    </div>
                    <Link href="/vehicles/add" className="btn-primary">
                        + Add Vehicle
                    </Link>
                </div>

                {/* Vehicles Grid */}
                {vehicles.length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {vehicles.map((vehicle) => (
                            <div key={vehicle.id} className="glass-card p-6 hover:scale-[1.02] transition-transform">
                                {/* Vehicle Icon */}
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d4aa]/20 to-[#00a883]/20 flex items-center justify-center text-4xl mb-4">
                                    🚗
                                </div>

                                {/* Vehicle Info */}
                                <h3 className="text-xl font-bold mb-1">
                                    {vehicle.make} {vehicle.model}
                                </h3>
                                <p className="text-[var(--muted)] mb-4">{vehicle.year}</p>

                                {/* Details */}
                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between">
                                        <span className="text-[var(--muted)]">License Plate</span>
                                        <span className="font-medium">{vehicle.licensePlate}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--muted)]">Battery</span>
                                        <span className="font-medium">{vehicle.batteryCapacity} kWh</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <Link
                                        href={`/monitoring?vehicleId=${vehicle.id}`}
                                        className="btn-secondary flex-1 text-center text-sm py-2"
                                    >
                                        Monitor
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(vehicle.id)}
                                        disabled={deletingId === vehicle.id}
                                        className="btn-danger text-sm py-2 px-4"
                                    >
                                        {deletingId === vehicle.id ? '...' : 'Remove'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="glass-card p-12 text-center">
                        <div className="text-6xl mb-4">🚗</div>
                        <h3 className="text-xl font-bold mb-2">No Vehicles Yet</h3>
                        <p className="text-[var(--muted)] mb-6">
                            Register your electric vehicle to start booking charging slots
                        </p>
                        <Link href="/vehicles/add" className="btn-primary inline-block">
                            Add Your First Vehicle
                        </Link>
                    </div>
                )}
            </main>

            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
        </div>
    )
}
