'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Toast, { useToast } from '@/components/Toast'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Vehicle {
    id: string
    make: string
    model: string
    licensePlate: string
    batteryCapacity: number
}

interface Station {
    id: string
    name: string
    location: string
    powerOutput: number
    status: string
}

interface Booking {
    id: string
    startTime: string
    endTime: string
    status: string
    vehicle: Vehicle
    station: Station
}

export default function BookingsPage() {
    const router = useRouter()
    const { toast, showToast, hideToast } = useToast()
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [stations, setStations] = useState<Station[]>([])
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [userName, setUserName] = useState('User')

    // Form state
    const [formData, setFormData] = useState({
        vehicleId: '',
        stationId: '',
        startTime: '',
        duration: 60,
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const res = await fetch('/api/bookings')
            if (res.status === 401) {
                router.push('/login')
                return
            }
            const data = await res.json()
            setVehicles(data.vehicles || [])
            setStations(data.stations || [])
            setBookings(data.bookings || [])

            // Set default start time to next hour
            const now = new Date()
            now.setHours(now.getHours() + 1, 0, 0, 0)
            setFormData(prev => ({
                ...prev,
                startTime: now.toISOString().slice(0, 16)
            }))
        } catch (error) {
            console.error('Failed to fetch data:', error)
            showToast('Failed to load data', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            const data = await res.json()

            if (!res.ok) {
                showToast(data.error || 'Failed to create booking', 'error')
                return
            }

            showToast('Booking confirmed!', 'success')
            fetchData() // Refresh data
            setFormData(prev => ({
                ...prev,
                vehicleId: '',
                stationId: '',
            }))
        } catch {
            showToast('Something went wrong', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleAction = async (bookingId: string, action: 'start' | 'cancel' | 'complete') => {
        try {
            const res = await fetch('/api/bookings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId, action }),
            })

            const data = await res.json()

            if (!res.ok) {
                showToast(data.error || 'Action failed', 'error')
                return
            }

            showToast(
                action === 'start' ? 'Charging started!' :
                    action === 'cancel' ? 'Booking cancelled' :
                        'Charging completed!',
                'success'
            )

            if (action === 'start') {
                router.push(`/monitoring?bookingId=${bookingId}`)
            } else {
                fetchData()
            }
        } catch {
            showToast('Action failed', 'error')
        }
    }

    const getStatusBadge = (status: string) => {
        const badges: { [key: string]: string } = {
            scheduled: 'badge-info',
            active: 'badge-warning',
            completed: 'badge-success',
            cancelled: 'badge-danger',
        }
        return badges[status] || 'badge-info'
    }

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    const scheduledBookings = bookings.filter(b => b.status === 'scheduled')
    const activeBookings = bookings.filter(b => b.status === 'active')
    const pastBookings = bookings.filter(b => ['completed', 'cancelled'].includes(b.status))

    return (
        <div className="min-h-screen">
            <Navbar userName={userName} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl font-bold mb-2">Book a Charging Slot</h1>
                <p className="text-[var(--muted)] mb-8">Reserve a charging station for your EV</p>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Booking Form */}
                    <div className="lg:col-span-1">
                        <div className="glass-card p-6 sticky top-24">
                            <h2 className="text-xl font-bold mb-6">New Booking</h2>

                            {vehicles.length === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-[var(--muted)] mb-4">No vehicles registered</p>
                                    <a href="/vehicles/add" className="btn-primary inline-block">
                                        Add Vehicle First
                                    </a>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Vehicle Selection */}
                                    <div>
                                        <label className="form-label">Select Vehicle</label>
                                        <select
                                            className="form-select"
                                            value={formData.vehicleId}
                                            onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                                            required
                                        >
                                            <option value="">Choose a vehicle</option>
                                            {vehicles.map((v) => (
                                                <option key={v.id} value={v.id}>
                                                    {v.make} {v.model} ({v.licensePlate})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Station Selection */}
                                    <div>
                                        <label className="form-label">Charging Station</label>
                                        <div className="space-y-2">
                                            {stations.map((s) => (
                                                <label
                                                    key={s.id}
                                                    className={`block p-4 rounded-xl border cursor-pointer transition-all ${formData.stationId === s.id
                                                            ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                                            : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/50'
                                                        } ${s.status !== 'available' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="station"
                                                        value={s.id}
                                                        checked={formData.stationId === s.id}
                                                        onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                                                        disabled={s.status !== 'available'}
                                                        className="sr-only"
                                                    />
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-medium">{s.name}</div>
                                                            <div className="text-sm text-[var(--muted)]">{s.location}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-medium text-[var(--primary)]">{s.powerOutput} kW</div>
                                                            <span className={`badge ${s.status === 'available' ? 'badge-success' : 'badge-warning'} text-xs`}>
                                                                {s.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Date/Time */}
                                    <div>
                                        <label className="form-label">Start Time</label>
                                        <input
                                            type="datetime-local"
                                            className="form-input"
                                            value={formData.startTime}
                                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                            min={new Date().toISOString().slice(0, 16)}
                                            required
                                        />
                                    </div>

                                    {/* Duration */}
                                    <div>
                                        <label className="form-label">Duration (minutes)</label>
                                        <select
                                            className="form-select"
                                            value={formData.duration}
                                            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                        >
                                            <option value={30}>30 minutes</option>
                                            <option value={60}>1 hour</option>
                                            <option value={90}>1.5 hours</option>
                                            <option value={120}>2 hours</option>
                                            <option value={180}>3 hours</option>
                                            <option value={240}>4 hours</option>
                                        </select>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn-primary w-full"
                                        disabled={submitting || !formData.vehicleId || !formData.stationId}
                                    >
                                        {submitting ? 'Booking...' : 'Confirm Booking'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Bookings List */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Active Sessions */}
                        {activeBookings.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                                    Active Charging
                                </h2>
                                <div className="space-y-4">
                                    {activeBookings.map((booking) => (
                                        <div key={booking.id} className="glass-card p-6 charging-active">
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                                <div>
                                                    <div className="font-bold text-lg">
                                                        {booking.vehicle.make} {booking.vehicle.model}
                                                    </div>
                                                    <div className="text-[var(--muted)]">
                                                        {booking.station.name} • {booking.station.powerOutput} kW
                                                    </div>
                                                    <div className="text-sm text-[var(--muted)] mt-1">
                                                        Started: {formatDateTime(booking.startTime)}
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <a
                                                        href={`/monitoring?bookingId=${booking.id}`}
                                                        className="btn-primary"
                                                    >
                                                        View Status
                                                    </a>
                                                    <button
                                                        onClick={() => handleAction(booking.id, 'complete')}
                                                        className="btn-secondary"
                                                    >
                                                        Stop Charging
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upcoming */}
                        {scheduledBookings.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold mb-4">Upcoming Bookings</h2>
                                <div className="space-y-4">
                                    {scheduledBookings.map((booking) => (
                                        <div key={booking.id} className="glass-card p-6">
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                                <div>
                                                    <div className="font-bold">
                                                        {booking.vehicle.make} {booking.vehicle.model}
                                                    </div>
                                                    <div className="text-[var(--muted)]">
                                                        {booking.station.name} • {formatDateTime(booking.startTime)}
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 items-center">
                                                    <span className={`badge ${getStatusBadge(booking.status)}`}>
                                                        {booking.status}
                                                    </span>
                                                    <button
                                                        onClick={() => handleAction(booking.id, 'start')}
                                                        className="btn-primary text-sm"
                                                    >
                                                        Start Charging
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(booking.id, 'cancel')}
                                                        className="btn-danger text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Past Bookings */}
                        {pastBookings.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold mb-4">Booking History</h2>
                                <div className="glass-card overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                                                <th className="p-4">Vehicle</th>
                                                <th className="p-4">Station</th>
                                                <th className="p-4">Date</th>
                                                <th className="p-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pastBookings.slice(0, 10).map((booking) => (
                                                <tr key={booking.id} className="border-b border-[var(--border)]/50">
                                                    <td className="p-4">
                                                        {booking.vehicle.make} {booking.vehicle.model}
                                                    </td>
                                                    <td className="p-4">{booking.station.name}</td>
                                                    <td className="p-4 text-[var(--muted)]">
                                                        {formatDateTime(booking.startTime)}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`badge ${getStatusBadge(booking.status)}`}>
                                                            {booking.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {bookings.length === 0 && (
                            <div className="glass-card p-12 text-center">
                                <div className="text-6xl mb-4">📅</div>
                                <h3 className="text-xl font-bold mb-2">No Bookings Yet</h3>
                                <p className="text-[var(--muted)]">
                                    Book your first charging slot using the form
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
        </div>
    )
}
