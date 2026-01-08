import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - List all vehicles for the current user
export async function GET() {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const vehicles = await prisma.vehicle.findMany({
            where: { userId: session.id },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ vehicles })
    } catch (error) {
        console.error('Get vehicles error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch vehicles' },
            { status: 500 }
        )
    }
}

// POST - Add a new vehicle
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { make, model, year, licensePlate, batteryCapacity } = await request.json()

        // Validate input
        if (!make || !model || !year || !licensePlate || !batteryCapacity) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            )
        }

        // Check if license plate already exists
        const existingVehicle = await prisma.vehicle.findUnique({
            where: { licensePlate: licensePlate.toUpperCase() }
        })

        if (existingVehicle) {
            return NextResponse.json(
                { error: 'License plate is already registered' },
                { status: 400 }
            )
        }

        const vehicle = await prisma.vehicle.create({
            data: {
                userId: session.id,
                make,
                model,
                year: parseInt(year),
                licensePlate: licensePlate.toUpperCase(),
                batteryCapacity: parseFloat(batteryCapacity),
            }
        })

        return NextResponse.json({ success: true, vehicle })
    } catch (error) {
        console.error('Add vehicle error:', error)
        return NextResponse.json(
            { error: 'Failed to add vehicle' },
            { status: 500 }
        )
    }
}

// DELETE - Remove a vehicle
export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await request.json()

        // Verify ownership
        const vehicle = await prisma.vehicle.findFirst({
            where: {
                id,
                userId: session.id
            }
        })

        if (!vehicle) {
            return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
        }

        await prisma.vehicle.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete vehicle error:', error)
        return NextResponse.json(
            { error: 'Failed to delete vehicle' },
            { status: 500 }
        )
    }
}
