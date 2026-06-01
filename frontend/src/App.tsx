import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Report from './pages/Report';
import Manual from './pages/Manual';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/report" element={<Report />} />
          <Route path="/manual" element={<Manual />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <footer className="no-print border-t border-jcb-border/60 px-6 py-3 text-xs text-muted-foreground flex justify-between">
        <span>WTY · Warranty Telehandler Yard · local dashboard</span>
        <span className="text-jcb-yellow/80">Source CSV contains no cost data — monetary metrics omitted.</span>
      </footer>
    </div>
  );
}
