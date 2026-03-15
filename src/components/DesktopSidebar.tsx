import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, UtensilsCrossed, ShoppingCart, TrendingUp, Settings, BookOpen } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/planning', icon: CalendarDays, label: 'Planning' },
  { to: '/meals', icon: UtensilsCrossed, label: 'Idées repas' },
  { to: '/my-recipes', icon: BookOpen, label: 'Mes recettes' },
  { to: '/shopping', icon: ShoppingCart, label: 'Courses' },
  { to: '/tracking', icon: TrendingUp, label: 'Suivi' },
  { to: '/settings', icon: Settings, label: 'Paramètres' },
];

export default function DesktopSidebar() {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-card border-r border-border/60 px-5 py-8">
      <div className="mb-12 px-3">
        <h1 className="text-xl font-display font-bold text-primary tracking-tight">MealPilot</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5 tracking-wide">Nutrition intelligente</p>
      </div>
      <nav className="flex flex-col gap-0.5 flex-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-primary/8 text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
