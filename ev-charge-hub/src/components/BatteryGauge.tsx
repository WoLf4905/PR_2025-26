'use client'

interface BatteryGaugeProps {
    chargeLevel: number
    isCharging?: boolean
    size?: number
}

export default function BatteryGauge({ chargeLevel, isCharging = false, size = 200 }: BatteryGaugeProps) {
    const radius = (size - 24) / 2
    const circumference = 2 * Math.PI * radius
    const progress = ((100 - chargeLevel) / 100) * circumference

    const getColor = () => {
        if (chargeLevel < 20) return '#ef4444'
        if (chargeLevel < 50) return '#f59e0b'
        return '#00d4aa'
    }

    return (
        <div className={`circular-progress ${isCharging ? 'charging-active' : ''}`} style={{ width: size, height: size }}>
            <svg width={size} height={size}>
                {/* Background circle */}
                <circle
                    className="progress-bg"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                />
                {/* Progress circle */}
                <circle
                    className="progress-bar"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    style={{
                        stroke: getColor(),
                        strokeDasharray: circumference,
                        strokeDashoffset: progress,
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold" style={{ color: getColor() }}>
                    {Math.round(chargeLevel)}%
                </span>
                <span className="text-sm text-[var(--muted)]">
                    {isCharging ? '⚡ Charging' : 'Battery'}
                </span>
            </div>
        </div>
    )
}
