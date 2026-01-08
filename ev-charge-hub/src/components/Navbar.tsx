'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface NavbarProps {
    userName: string
}

export default function Navbar({ userName }: NavbarProps) {
    const pathname = usePathname()
    const router = useRouter()

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: '⚡' },
        { href: '/vehicles', label: 'My Vehicles', icon: '🚗' },
        { href: '/bookings', label: 'Book Slot', icon: '📅' },
        { href: '/monitoring', label: 'Monitoring', icon: '📊' },
    ]

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login')
        router.refresh()
    }

    return (
        <nav className="glass-card sticky top-0 z-50" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d4aa] to-[#00a883] flex items-center justify-center text-xl">
                            ⚡
                        </div>
                        <span className="text-xl font-bold text-gradient">EV Charge Hub</span>
                    </Link>

                    {/* Navigation Links - Desktop */}
                    <div className="hidden md:flex items-center gap-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-link ${pathname === item.href ? 'active' : ''}`}
                            >
                                <span>{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    {/* User Menu */}
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:block text-sm text-[var(--muted)]">
                            Welcome, <span className="text-[var(--foreground)] font-medium">{userName}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="btn-secondary text-sm py-2 px-4"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <div className="md:hidden flex justify-center gap-2 pb-3 overflow-x-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-link whitespace-nowrap text-sm ${pathname === item.href ? 'active' : ''}`}
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    )
}
