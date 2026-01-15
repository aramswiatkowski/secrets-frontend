import React from 'react'

export function Toast({ message, onClose }: { message: string, onClose: () => void }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50">
      <div className="max-w-md w-[92%] rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-lg text-sm">
        {message}
      </div>
    </div>
  )
}
