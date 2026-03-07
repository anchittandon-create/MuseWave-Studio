import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Music, LayoutDashboard, Settings, Library } from 'lucide-react';
import HomePage from './pages/HomePage';
import CreateMusicPage from './pages/CreateMusicPage';
import DashboardPage from './pages/DashboardPage';
import { PlayerProvider } from './context/PlayerContext';
import PlayerView from './components/PlayerView';

function Sidebar() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: <Home size={20} />, label: 'Home' },
    { path: '/create', icon: <Music size={20} />, label: 'Create Music' },
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/library', icon: <Library size={20} />, label: 'Library' },
  ];

  return (
    <aside className="w-64 h-full bg-[#0f0f10] border-r border-[#2c2c2e] flex flex-col shrink-0 z-50">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-900/20">
          G
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">Gemini Studio</h1>
          <p className="text-slate-400 text-xs">Music Generation</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              location.pathname === item.path
                ? 'bg-blue-600/20 text-blue-500 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {item.icon}
            <span className="font-medium text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>
      
      <div className="p-4 mt-auto">
        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          <Settings size={20} />
          <span className="font-medium text-sm">Settings</span>
        </button>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <Router>
        <div className="flex h-screen bg-[#121214] text-slate-300 font-sans overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto relative pb-20">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/create" element={<CreateMusicPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Routes>
          </main>
          <PlayerView />
        </div>
      </Router>
    </PlayerProvider>
  );
}
