import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { seedChargingStations } from '@/lib/utils'

// GET - List all bookings and available stations
export async function GET() {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Ensure stations are seeded
        await seedChargingStations()

        // Get user's bookings
        const bookings = await prisma.booking.findMany({
            where: { userId: session.id },
            include: {
                vehicle: true,
                station: true,
            },
            orderBy: { startTime: 'desc' }
        })

        // Get all stations
        const stations = await prisma.chargingStation.findMany({
            orderBy: { name: 'asc' }
        })

        // Get user's vehicles
        const vehicles = await prisma.vehicle.findMany({
            where: { userId: session.id }
        })

        return NextResponse.json({ bookings, stations, vehicles })
    } catch (error) {
        console.error('Get bookings error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch bookings' },
            { status: 500 }
        )
    }
}

// POST - Create a new booking
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { vehicleId, stationId, startTime, duration } = await request.json()

        // Validate input
        if (!vehicleId || !stationId || !startTime || !duration) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            )
        }

        // Verify vehicle ownership
        const vehicle = await prisma.vehicle.findFirst({
            where: {
                id: vehicleId,
                userId: session.id
            }
        })

        if (!vehicle) {
            return NextResponse.json(
                { error: 'Vehicle not found' },
                { status: 404 }
            )
        }

        // Calculate end time
        const start = new Date(startTime)
        const end = new Date(start.getTime() + duration * 60 * 1000)

        // Check for conflicts
        const conflict = await prisma.booking.findFirst({
            where: {
                stationId,
                status: { in: ['scheduled', 'active'] },
                OR: [
                    {
                        startTime: { lte: start },
                        endTime: { gte: start }
                    },
                    {
                        startTime: { lte: end },
                        endTime: { gte: end }
                    },
                    {
                        startTime: { gte: start },
                        endTime: { lte: end }
                    }
                ]
            }
        })

        if (conflict) {
            return NextResponse.json(
                { error: 'This time slot is already booked' },
                { status: 400 }
            )
        }

        const booking = await prisma.booking.create({
            data: {
                userId: session.id,
                vehicleId,
                stationId,
                startTime: start,
                endTime: end,
                status: 'scheduled'
            },
            include: {
                vehicle: true,
                station: true
            }
        })

        return NextResponse.json({ success: true, booking })
    } catch (error) {
        console.error('Create booking error:', error)
        return NextResponse.json(
            { error: 'Failed to create booking' },
            { status: 500 }
        )
    }
}

// PATCH - Update booking status (start charging, cancel, complete)
export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { bookingId, action } = await request.json()

        // Verify ownership
        const booking = await prisma.booking.findFirst({
            where: {
                id: bookingId,
                userId: session.id
            },
            include: { station: true }
        })

        if (!booking) {
            return NextResponse.json(
                { error: 'Booking not found' },
                { status: 404 }
            )
        }

        let newStatus = booking.status

        switch (action) {
            case 'start':
                if (booking.status === 'scheduled') {
                    newStatus = 'active'
                    // Update station status
                    await prisma.chargingStation.update({
                        where: { id: booking.stationId },
                        data: { status: 'occupied' }
                    })
                }
                break
            case 'complete':
                if (booking.status === 'active') {
                    newStatus = 'completed'
                    // Free up the station
                    await prisma.chargingStation.update({
                        where: { id: booking.stationId },
                        data: { status: 'available' }
                    })
                }
                break
            case 'cancel':
                if (['scheduled', 'active'].includes(booking.status)) {
                    newStatus = 'cancelled'
                    // Free up the station if it was occupied
                    if (booking.status === 'active') {
                        await prisma.chargingStation.update({
                            where: { id: booking.stationId },
                            data: { status: 'available' }
                        })
                    }
                }
                break
            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                )
        }

        const updatedBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: { status: newStatus },
            include: {
                vehicle: true,
                station: true
            }
        })

        return NextResponse.json({ success: true, booking: updatedBooking })
    } catch (error) {
        console.error('Update booking error:', error)
        return NextResponse.json(
            { error: 'Failed to update booking' },
            { status: 500 }
        )
    }
}
