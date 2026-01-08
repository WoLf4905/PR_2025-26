export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizeClasses = {
        sm: 'w-5 h-5 border-2',
        md: 'w-10 h-10 border-3',
        lg: 'w-16 h-16 border-4',
    }

    return (
        <div className="flex items-center justify-center p-4">
            <div className={`spinner ${sizeClasses[size]}`} />
        </div>
    )
}
