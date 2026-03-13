import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, UtensilsCrossed, ShoppingCart, TrendingUp, Settings } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/planning', icon: CalendarDays, label: 'Planning' },
  { to: '/meals', icon: UtensilsCrossed, label: 'Repas' },
  { to: '/shopping', icon: ShoppingCart, label: 'Courses' },
  { to: '/tracking', icon: TrendingUp, label: 'Suivi' },
  { to: '/settings', icon: Settings, label: 'Paramètres' },
];

export default function DesktopSidebar() {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-card border-r border-border p-6">
      <div className="mb-10">
        <h1 className="text-2xl font-display font-extrabold text-primary tracking-tight">MealPilot</h1>
        <p className="text-xs text-muted-foreground mt-1">Ton assistant repas</p>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
