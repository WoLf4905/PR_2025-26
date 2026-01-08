import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default async function DashboardPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch dashboard data
    const [vehicles, activeBookings, upcomingBookings, recentBookings] = await Promise.all([
        prisma.vehicle.findMany({
            where: { userId: user.id },
            take: 5,
        }),
        prisma.booking.findMany({
            where: { userId: user.id, status: 'active' },
            include: { vehicle: true, station: true },
        }),
        prisma.booking.findMany({
            where: {
                userId: user.id,
                status: 'scheduled',
                startTime: { gte: new Date() }
            },
            include: { vehicle: true, station: true },
            orderBy: { startTime: 'asc' },
            take: 3,
        }),
        prisma.booking.findMany({
            where: { userId: user.id, status: 'completed' },
            include: { vehicle: true, station: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
        }),
    ])

    const totalChargingSessions = await prisma.booking.count({
        where: { userId: user.id, status: 'completed' }
    })

    return (
        <div className="min-h-screen">
            <Navbar userName={user.name} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">
                        Welcome back, <span className="text-gradient">{user.name.split(' ')[0]}</span>! 👋
                    </h1>
                    <p className="text-[var(--muted)]">Here&apos;s your EV charging overview</p>
                </div>

                {/* Stats Cards */}
                <div className="dashboard-grid mb-8">
                    <div className="stat-card">
                        <div className="text-3xl mb-2">🚗</div>
                        <div className="stat-value">{vehicles.length}</div>
                        <div className="stat-label">Registered Vehicles</div>
                    </div>
                    <div className="stat-card">
                        <div className="text-3xl mb-2">⚡</div>
                        <div className="stat-value">{activeBookings.length}</div>
                        <div className="stat-label">Active Charging</div>
                    </div>
                    <div className="stat-card">
                        <div className="text-3xl mb-2">📅</div>
                        <div className="stat-value">{upcomingBookings.length}</div>
                        <div className="stat-label">Upcoming Bookings</div>
                    </div>
                    <div className="stat-card">
                        <div className="text-3xl mb-2">✅</div>
                        <div className="stat-value">{totalChargingSessions}</div>
                        <div className="stat-label">Total Sessions</div>
                    </div>
                </div>

                {/* Active Charging Session */}
                {activeBookings.length > 0 && (
                    <div className="glass-card p-6 mb-8 charging-active">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                            Active Charging Session
                        </h2>
                        {activeBookings.map((booking) => (
                            <div key={booking.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <div className="font-semibold text-lg">
                                        {booking.vehicle.make} {booking.vehicle.model}
                                    </div>
                                    <div className="text-[var(--muted)]">
                                        {booking.vehicle.licensePlate} • {booking.station.name}
                                    </div>
                                </div>
                                <Link
                                    href={`/monitoring?bookingId=${booking.id}`}
                                    className="btn-primary"
                                >
                                    View Monitoring →
                                </Link>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Upcoming Bookings */}
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Upcoming Bookings</h2>
                            <Link href="/bookings" className="text-[var(--primary)] text-sm hover:underline">
                                View all →
                            </Link>
                        </div>
                        {upcomingBookings.length > 0 ? (
                            <div className="space-y-4">
                                {upcomingBookings.map((booking) => (
                                    <div key={booking.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--card)]">
                                        <div>
                                            <div className="font-medium">{booking.vehicle.make} {booking.vehicle.model}</div>
                                            <div className="text-sm text-[var(--muted)]">
                                                {booking.station.name} • {new Date(booking.startTime).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                        <span className="badge badge-info">Scheduled</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-[var(--muted)]">
                                <p>No upcoming bookings</p>
                                <Link href="/bookings" className="btn-primary inline-block mt-4">
                                    Book a Slot
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* My Vehicles */}
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">My Vehicles</h2>
                            <Link href="/vehicles" className="text-[var(--primary)] text-sm hover:underline">
                                Manage →
                            </Link>
                        </div>
                        {vehicles.length > 0 ? (
                            <div className="space-y-4">
                                {vehicles.map((vehicle) => (
                                    <div key={vehicle.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--card)]">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00d4aa]/20 to-[#00a883]/20 flex items-center justify-center text-2xl">
                                                🚗
                                            </div>
                                            <div>
                                                <div className="font-medium">{vehicle.make} {vehicle.model}</div>
                                                <div className="text-sm text-[var(--muted)]">
                                                    {vehicle.licensePlate} • {vehicle.batteryCapacity} kWh
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-[var(--muted)]">
                                <p>No vehicles registered yet</p>
                                <Link href="/vehicles/add" className="btn-primary inline-block mt-4">
                                    Add Vehicle
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Charging History */}
                {recentBookings.length > 0 && (
                    <div className="glass-card p-6 mt-8">
                        <h2 className="text-xl font-bold mb-4">Recent Charging History</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                                        <th className="pb-3">Vehicle</th>
                                        <th className="pb-3">Station</th>
                                        <th className="pb-3">Date</th>
                                        <th className="pb-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentBookings.map((booking) => (
                                        <tr key={booking.id} className="border-b border-[var(--border)]/50">
                                            <td className="py-4">{booking.vehicle.make} {booking.vehicle.model}</td>
                                            <td className="py-4">{booking.station.name}</td>
                                            <td className="py-4 text-[var(--muted)]">
                                                {new Date(booking.startTime).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </td>
                                            <td className="py-4">
                                                <span className="badge badge-success">Completed</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
