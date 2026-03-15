import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, UtensilsCrossed, ShoppingCart, TrendingUp, BookOpen, Settings } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/planning', icon: CalendarDays, label: 'Planning' },
  { to: '/meals', icon: UtensilsCrossed, label: 'Repas' },
  { to: '/my-recipes', icon: BookOpen, label: 'Recettes' },
  { to: '/shopping', icon: ShoppingCart, label: 'Courses' },
  { to: '/tracking', icon: TrendingUp, label: 'Suivi' },
  { to: '/settings', icon: Settings, label: 'Réglages' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden">
      <div className="flex items-center justify-around h-14 px-0">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0 px-1 py-1 rounded-md tap-scale text-[10px] font-medium transition-colors min-w-0 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate max-w-full">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
