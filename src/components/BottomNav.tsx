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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border/60 lg:hidden safe-area-pb">
      <div className="flex items-center justify-around h-14 px-0">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg tap-scale text-[10px] font-medium transition-colors min-w-0 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? '' : 'opacity-70'}`} />
              <span className="truncate max-w-full">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
