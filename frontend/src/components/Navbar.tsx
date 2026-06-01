import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Truck, Upload, FileText, BookOpen } from 'lucide-react';

export default function Navbar() {
  const loc = useLocation();
  return (
    <header className="no-print sticky top-0 z-40 bg-black border-b-2 border-jcb-yellow">
      <div className="mx-auto max-w-[1600px] flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-14 rounded-sm bg-jcb-yellow text-black font-black tracking-tighter text-lg">
            WTY
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm font-semibold text-foreground">Warranty Telehandler Yard</span>
            <span className="text-[10px] uppercase tracking-widest text-jcb-yellow/80">LDL Division · Claims Intelligence</span>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <NavItem to="/" label="Dashboard" icon={<Truck className="h-4 w-4" />} active={loc.pathname === '/'} />
          <NavItem to="/report" label="Report" icon={<FileText className="h-4 w-4" />} active={loc.pathname === '/report'} />
          <NavItem to="/manual" label="Manual" icon={<BookOpen className="h-4 w-4" />} active={loc.pathname === '/manual'} />
          <NavItem to="/admin" label="Admin" icon={<Upload className="h-4 w-4" />} active={loc.pathname === '/admin'} />
        </nav>
      </div>
    </header>
  );
}

function NavItem({ to, label, icon, active }: { to: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <NavLink
      to={to}
      className={cn(
        'group relative inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
        active ? 'text-jcb-yellow' : 'text-foreground hover:text-jcb-yellow'
      )}
    >
      {icon}
      <span>{label}</span>
      <span
        className={cn(
          'absolute -bottom-[14px] left-2 right-2 h-[3px] rounded-t-sm bg-jcb-yellow transition-all',
          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
        )}
      />
    </NavLink>
  );
}
