import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: any) =>
  `px-3 py-2 rounded-xl text-sm font-medium ${isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`

export function TopNav() {
  return (
    <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" className="w-8 h-8" />
          <div>
            <div className="text-sm font-semibold">Secrets of Decoupage VIP</div>
            <div className="text-xs text-slate-500">Library • Credits • Community</div>
          </div>
        </div>
        <div className="flex gap-2">
          <NavLink to="/app" className={linkClass} end>Home</NavLink>
          <NavLink to="/app/credits" className={linkClass}>Credits</NavLink>
          <NavLink to="/app/community" className={linkClass}>Community</NavLink>
          <NavLink to="/app/account" className={linkClass}>Account</NavLink>
        </div>
      </div>
    </div>
  )
}
