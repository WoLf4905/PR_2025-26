import { prisma } from './prisma'

// Seed sample charging stations if none exist
export async function seedChargingStations() {
    const count = await prisma.chargingStation.count()

    if (count === 0) {
        await prisma.chargingStation.createMany({
            data: [
                {
                    name: 'Station A',
                    location: 'Basement Parking - Spot 1',
                    powerOutput: 7.2,
                    status: 'available'
                },
                {
                    name: 'Station B',
                    location: 'Basement Parking - Spot 2',
                    powerOutput: 7.2,
                    status: 'available'
                },
                {
                    name: 'Station C',
                    location: 'Ground Floor - East Wing',
                    powerOutput: 22.0,
                    status: 'available'
                },
                {
                    name: 'Fast Charger',
                    location: 'Main Entrance',
                    powerOutput: 50.0,
                    status: 'available'
                },
            ]
        })
        console.log('✅ Seeded charging stations')
    }
}

// Popular EV models data
export const popularEVModels = [
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

// Format date for display
export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(date))
}

// Calculate estimated charging time
export function estimateChargingTime(
    currentLevel: number,
    targetLevel: number,
    batteryCapacity: number, // kWh
    chargingPower: number // kW
): number {
    if (chargingPower <= 0) return 0

    const energyNeeded = ((targetLevel - currentLevel) / 100) * batteryCapacity
    const timeHours = energyNeeded / chargingPower

    return Math.ceil(timeHours * 60) // Return minutes
}

// Get status color class
export function getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
        case 'available':
            return 'text-emerald-400 bg-emerald-400/20'
        case 'occupied':
        case 'active':
            return 'text-amber-400 bg-amber-400/20'
        case 'scheduled':
            return 'text-blue-400 bg-blue-400/20'
        case 'completed':
            return 'text-green-400 bg-green-400/20'
        case 'cancelled':
        case 'maintenance':
            return 'text-red-400 bg-red-400/20'
        default:
            return 'text-gray-400 bg-gray-400/20'
    }
}
