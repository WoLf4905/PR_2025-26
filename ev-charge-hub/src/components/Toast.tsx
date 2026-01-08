'use client'

import { useState, useEffect } from 'react'

interface ToastProps {
    message: string
    type: 'success' | 'error' | 'info'
    onClose: () => void
}

export default function Toast({ message, type, onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose()
        }, 4000)

        return () => clearTimeout(timer)
    }, [onClose])

    const bgClass = {
        success: 'toast-success',
        error: 'toast-error',
        info: 'bg-[var(--secondary)] text-white',
    }[type]

    return (
        <div className={`toast ${bgClass}`}>
            {message}
        </div>
    )
}

// Hook for toast management
export function useToast() {
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type })
    }

    const hideToast = () => {
        setToast(null)
    }

    return { toast, showToast, hideToast }
}
