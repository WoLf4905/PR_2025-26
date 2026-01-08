import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - Get battery monitoring data for a vehicle
export async function GET(request: NextRequest) {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const vehicleId = searchParams.get('vehicleId')
        const bookingId = searchParams.get('bookingId')

        let vehicle = null
        let booking = null

        if (bookingId) {
            booking = await prisma.booking.findFirst({
                where: {
                    id: bookingId,
                    userId: session.id
                },
                include: {
                    vehicle: true,
                    station: true
                }
            })

            if (booking) {
                vehicle = booking.vehicle
            }
        } else if (vehicleId) {
            vehicle = await prisma.vehicle.findFirst({
                where: {
                    id: vehicleId,
                    userId: session.id
                }
            })
        }

        if (!vehicle) {
            return NextResponse.json(
                { error: 'Vehicle not found' },
                { status: 404 }
            )
        }

        // Get the latest battery log
        const latestLog = await prisma.batteryLog.findFirst({
            where: { vehicleId: vehicle.id },
            orderBy: { timestamp: 'desc' }
        })

        // Get recent logs for chart data (last 20 entries)
        const recentLogs = await prisma.batteryLog.findMany({
            where: { vehicleId: vehicle.id },
            orderBy: { timestamp: 'desc' },
            take: 20
        })

        // If no real data, generate simulated data for demo
        const simulatedData = !latestLog ? {
            chargeLevel: Math.random() * 60 + 20, // 20-80%
            voltage: Math.random() * 50 + 350, // 350-400V
            current: Math.random() * 40 + 10, // 10-50A
            temperature: Math.random() * 15 + 25, // 25-40°C
            healthScore: Math.random() * 10 + 88, // 88-98%
            chargingPower: Math.random() * 15 + 7, // 7-22kW
            estimatedTime: Math.floor(Math.random() * 120 + 30), // 30-150 min
            timestamp: new Date().toISOString()
        } : null

        return NextResponse.json({
            vehicle,
            booking,
            latestLog: latestLog || simulatedData,
            recentLogs,
            isSimulated: !latestLog
        })
    } catch (error) {
        console.error('Get monitoring data error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch monitoring data' },
            { status: 500 }
        )
    }
}
