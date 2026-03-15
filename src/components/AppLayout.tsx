import { ReactNode } from 'react';
import BottomNav from './BottomNav';
import DesktopSidebar from './DesktopSidebar';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      <main className="lg:ml-64 pb-20 lg:pb-8 min-h-screen">
        <div className="max-w-2xl mx-auto px-5 py-8">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
