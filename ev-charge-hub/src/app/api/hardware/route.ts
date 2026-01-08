import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const HARDWARE_API_KEY = process.env.HARDWARE_API_KEY || 'ev-hardware-key-2024'

// POST - Receive battery status from hardware (ESP32/Arduino)
export async function POST(request: NextRequest) {
    try {
        // Authenticate hardware device
        const apiKey = request.headers.get('X-API-Key')

        if (apiKey !== HARDWARE_API_KEY) {
            return NextResponse.json(
                { error: 'Invalid API key' },
                { status: 401 }
            )
        }

        const data = await request.json()

        const { vehicleId, chargeLevel, voltage, current, temperature, healthScore, chargingPower, estimatedTime } = data

        if (!vehicleId || chargeLevel === undefined) {
            return NextResponse.json(
                { error: 'vehicleId and chargeLevel are required' },
                { status: 400 }
            )
        }

        // Verify vehicle exists
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: vehicleId }
        })

        if (!vehicle) {
            return NextResponse.json(
                { error: 'Vehicle not found' },
                { status: 404 }
            )
        }

        // Create battery log
        const log = await prisma.batteryLog.create({
            data: {
                vehicleId,
                chargeLevel: parseFloat(chargeLevel),
                voltage: voltage ? parseFloat(voltage) : null,
                current: current ? parseFloat(current) : null,
                temperature: temperature ? parseFloat(temperature) : null,
                healthScore: healthScore ? parseFloat(healthScore) : null,
                chargingPower: chargingPower ? parseFloat(chargingPower) : null,
                estimatedTime: estimatedTime ? parseInt(estimatedTime) : null,
            }
        })

        return NextResponse.json({
            success: true,
            logId: log.id,
            message: 'Battery status recorded'
        })
    } catch (error) {
        console.error('Hardware status error:', error)
        return NextResponse.json(
            { error: 'Failed to record battery status' },
            { status: 500 }
        )
    }
}

// GET - Get charging command for hardware
export async function GET(request: NextRequest) {
    try {
        // Authenticate hardware device
        const apiKey = request.headers.get('X-API-Key')

        if (apiKey !== HARDWARE_API_KEY) {
            return NextResponse.json(
                { error: 'Invalid API key' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const vehicleId = searchParams.get('vehicleId')

        if (!vehicleId) {
            return NextResponse.json(
                { error: 'vehicleId is required' },
                { status: 400 }
            )
        }

        // Check for active booking
        const activeBooking = await prisma.booking.findFirst({
            where: {
                vehicleId,
                status: 'active'
            },
            include: {
                station: true
            }
        })

        if (activeBooking) {
            return NextResponse.json({
                command: 'charge',
                stationId: activeBooking.stationId,
                stationName: activeBooking.station.name,
                powerOutput: activeBooking.station.powerOutput,
                bookingId: activeBooking.id,
                startTime: activeBooking.startTime,
                endTime: activeBooking.endTime
            })
        }

        return NextResponse.json({
            command: 'idle',
            message: 'No active charging session'
        })
    } catch (error) {
        console.error('Hardware command error:', error)
        return NextResponse.json(
            { error: 'Failed to get command' },
            { status: 500 }
        )
    }
}
