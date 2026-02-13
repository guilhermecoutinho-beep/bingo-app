import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Users, Grid3X3, User, Shield, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useState } from 'react'

const navItems = [
  { to: '/participantes', label: 'Participantes', icon: Users },
  { to: '/tabelas', label: 'Tabelas', icon: Grid3X3 },
  { to: '/perfil', label: 'Meu Perfil', icon: User },
]

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const SidebarContent = () => (
    <>
      <div className="px-5 pt-6 pb-8">
        <h1 className="font-display text-3xl font-black tracking-tight text-gray-900">
          BINGO
        </h1>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
        {profile?.is_admin && (
          <NavLink
            to="/admin"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`
            }
          >
            <Shield size={18} />
            Admin
          </NavLink>
        )}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 w-full"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-bg-main">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-40">
        <h1 className="font-display text-xl font-black text-gray-900">BINGO</h1>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white z-40 flex flex-col transform transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-52 bg-white border-r border-gray-200 flex-col z-30">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="md:ml-52 min-h-screen p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
