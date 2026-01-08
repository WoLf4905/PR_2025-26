'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import BatteryGauge from '@/components/BatteryGauge'
import LoadingSpinner from '@/components/LoadingSpinner'

interface BatteryData {
    chargeLevel: number
    voltage: number | null
    current: number | null
    temperature: number | null
    healthScore: number | null
    chargingPower: number | null
    estimatedTime: number | null
    timestamp: string
}

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
}

interface Booking {
    id: string
    status: string
    startTime: string
    endTime: string
    station: Station
}

function MonitoringContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const bookingId = searchParams.get('bookingId')
    const vehicleId = searchParams.get('vehicleId')

    const [loading, setLoading] = useState(true)
    const [batteryData, setBatteryData] = useState<BatteryData | null>(null)
    const [vehicle, setVehicle] = useState<Vehicle | null>(null)
    const [booking, setBooking] = useState<Booking | null>(null)
    const [isSimulated, setIsSimulated] = useState(true)
    const [userName, setUserName] = useState('User')
    const [autoRefresh, setAutoRefresh] = useState(true)

    const fetchData = useCallback(async () => {
        try {
            const params = new URLSearchParams()
            if (bookingId) params.set('bookingId', bookingId)
            if (vehicleId) params.set('vehicleId', vehicleId)

            const res = await fetch(`/api/monitoring?${params}`)
            if (res.status === 401) {
                router.push('/login')
                return
            }

            if (res.status === 404) {
                // No vehicle found
                return
            }

            const data = await res.json()
            setBatteryData(data.latestLog)
            setVehicle(data.vehicle)
            setBooking(data.booking)
            setIsSimulated(data.isSimulated)
        } catch (error) {
            console.error('Failed to fetch monitoring data:', error)
        } finally {
            setLoading(false)
        }
    }, [bookingId, vehicleId, router])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Auto-refresh every 5 seconds
    useEffect(() => {
        if (!autoRefresh) return

        const interval = setInterval(() => {
            fetchData()
        }, 5000)

        return () => clearInterval(interval)
    }, [autoRefresh, fetchData])

    const getHealthColor = (score: number) => {
        if (score >= 90) return 'text-green-400'
        if (score >= 70) return 'text-amber-400'
        return 'text-red-400'
    }

    const getTempColor = (temp: number) => {
        if (temp <= 35) return 'text-green-400'
        if (temp <= 45) return 'text-amber-400'
        return 'text-red-400'
    }

    const formatTime = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return `${hours}h ${mins}m`
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    if (!vehicle) {
        return (
            <div className="min-h-screen">
                <Navbar userName={userName} />
                <main className="max-w-7xl mx-auto px-4 py-8">
                    <div className="glass-card p-12 text-center">
                        <div className="text-6xl mb-4">📊</div>
                        <h2 className="text-2xl font-bold mb-2">No Vehicle Selected</h2>
                        <p className="text-[var(--muted)] mb-6">
                            Start a charging session or select a vehicle to monitor
                        </p>
                        <a href="/bookings" className="btn-primary inline-block">
                            Book a Charging Slot
                        </a>
                    </div>
                </main>
            </div>
        )
    }

    const isCharging = booking?.status === 'active'

    return (
        <div className="min-h-screen">
            <Navbar userName={userName} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Battery Monitoring</h1>
                        <p className="text-[var(--muted)] mt-1">
                            Real-time charging status for {vehicle.make} {vehicle.model}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {isSimulated && (
                            <span className="badge badge-warning">Demo Mode</span>
                        )}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="w-4 h-4 rounded"
                            />
                            <span className="text-sm text-[var(--muted)]">Auto-refresh</span>
                        </label>
                    </div>
                </div>

                {/* Vehicle Info Card */}
                <div className="glass-card p-6 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00d4aa]/20 to-[#00a883]/20 flex items-center justify-center text-5xl">
                            🚗
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold">{vehicle.make} {vehicle.model}</h2>
                            <p className="text-[var(--muted)]">{vehicle.licensePlate} • {vehicle.batteryCapacity} kWh</p>
                            {booking && (
                                <p className="text-sm mt-1">
                                    Station: <span className="text-[var(--primary)]">{booking.station.name}</span>
                                    {' • '}{booking.station.powerOutput} kW
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                            {isCharging ? (
                                <span className="badge badge-warning text-lg px-4 py-2">
                                    ⚡ Charging
                                </span>
                            ) : (
                                <span className="badge badge-info text-lg px-4 py-2">
                                    Idle
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Stats Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
                    {/* Battery Gauge */}
                    <div className={`glass-card p-8 flex flex-col items-center ${isCharging ? 'charging-active' : ''}`}>
                        <BatteryGauge
                            chargeLevel={batteryData?.chargeLevel || 0}
                            isCharging={isCharging}
                            size={220}
                        />
                        <div className="mt-4 text-center">
                            <div className="text-sm text-[var(--muted)]">Current Charge</div>
                            {isCharging && batteryData?.estimatedTime && (
                                <div className="text-lg font-medium text-[var(--primary)] mt-2">
                                    {formatTime(batteryData.estimatedTime)} remaining
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detailed Stats */}
                    <div className="glass-card p-6 space-y-6">
                        <h3 className="text-lg font-bold">Battery Details</h3>

                        {/* Voltage */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    ⚡
                                </div>
                                <div>
                                    <div className="text-sm text-[var(--muted)]">Voltage</div>
                                    <div className="font-bold">{batteryData?.voltage?.toFixed(1) || '--'} V</div>
                                </div>
                            </div>
                        </div>

                        {/* Current */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                    🔌
                                </div>
                                <div>
                                    <div className="text-sm text-[var(--muted)]">Current</div>
                                    <div className="font-bold">{batteryData?.current?.toFixed(1) || '--'} A</div>
                                </div>
                            </div>
                        </div>

                        {/* Charging Power */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                    ⚡
                                </div>
                                <div>
                                    <div className="text-sm text-[var(--muted)]">Charging Power</div>
                                    <div className="font-bold text-[var(--primary)]">
                                        {batteryData?.chargingPower?.toFixed(1) || '--'} kW
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Temperature */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                                    🌡️
                                </div>
                                <div>
                                    <div className="text-sm text-[var(--muted)]">Temperature</div>
                                    <div className={`font-bold ${getTempColor(batteryData?.temperature || 0)}`}>
                                        {batteryData?.temperature?.toFixed(1) || '--'} °C
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Battery Health */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold mb-6">Battery Health</h3>

                        <div className="text-center mb-6">
                            <div className={`text-5xl font-bold ${getHealthColor(batteryData?.healthScore || 0)}`}>
                                {batteryData?.healthScore?.toFixed(0) || '--'}%
                            </div>
                            <div className="text-sm text-[var(--muted)] mt-2">Overall Health Score</div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--muted)]">Capacity</span>
                                <span>{vehicle.batteryCapacity} kWh</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--muted)]">Usable Capacity</span>
                                <span>
                                    {((batteryData?.healthScore || 100) / 100 * vehicle.batteryCapacity).toFixed(1)} kWh
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--muted)]">Status</span>
                                <span className={getHealthColor(batteryData?.healthScore || 0)}>
                                    {(batteryData?.healthScore || 0) >= 90 ? 'Excellent' :
                                        (batteryData?.healthScore || 0) >= 70 ? 'Good' : 'Fair'}
                                </span>
                            </div>
                        </div>

                        {/* Health bar */}
                        <div className="mt-6">
                            <div className="h-3 bg-[var(--border)] rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${(batteryData?.healthScore || 0) >= 90 ? 'bg-green-500' :
                                            (batteryData?.healthScore || 0) >= 70 ? 'bg-amber-500' : 'bg-red-500'
                                        }`}
                                    style={{ width: `${batteryData?.healthScore || 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charging Progress */}
                {isCharging && (
                    <div className="glass-card p-6 charging-active">
                        <h3 className="text-lg font-bold mb-4">Charging Progress</h3>
                        <div className="relative h-6 bg-[var(--border)] rounded-full overflow-hidden">
                            <div
                                className="h-full charging-indicator rounded-full transition-all duration-500"
                                style={{ width: `${batteryData?.chargeLevel || 0}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                                {batteryData?.chargeLevel?.toFixed(1)}% Complete
                            </div>
                        </div>
                        <div className="flex justify-between mt-4 text-sm text-[var(--muted)]">
                            <span>Started: {new Date(booking.startTime).toLocaleTimeString()}</span>
                            <span>Est. Complete: {batteryData?.estimatedTime ? formatTime(batteryData.estimatedTime) : '--'}</span>
                        </div>
                    </div>
                )}

                {/* Info Note for Demo */}
                {isSimulated && (
                    <div className="mt-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">💡</span>
                            <div>
                                <div className="font-medium text-amber-400">Demo Mode Active</div>
                                <div className="text-sm text-[var(--muted)] mt-1">
                                    Battery data is simulated for demonstration. Once you connect your hardware
                                    (ESP32/Arduino), real data will be displayed here. The hardware can send data
                                    to <code className="bg-[var(--card)] px-2 py-1 rounded">POST /api/hardware</code>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

export default function MonitoringPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        }>
            <MonitoringContent />
        </Suspense>
    )
}
