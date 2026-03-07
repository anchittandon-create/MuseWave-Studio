import { Link } from 'react-router-dom';
import { Sparkles, Music, Waves, Cpu, LayoutDashboard } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#121214] via-[#1c1c1e] to-[#0f0f10]">
      <div className="max-w-3xl text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4">
          <Sparkles size={16} />
          <span>Powered by Gemini Music Gen</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
          Compose deterministic loops with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">AI orchestration.</span>
        </h1>
        
        <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Generate production-ready audio in fixed 30-second segments. Stitch segments into ONE continuous master audio file with seamless tonal, tempo, and rhythmic continuity.
        </p>
        
        <div className="pt-8 flex items-center justify-center gap-6">
          <Link
            to="/create"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-900/20 transition-all hover:scale-105 flex items-center gap-3 text-lg"
          >
            <Music size={24} />
            Create Music
          </Link>
          <Link
            to="/dashboard"
            className="px-8 py-4 bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white font-bold rounded-lg transition-all hover:scale-105 flex items-center gap-3 text-lg"
          >
            <LayoutDashboard size={24} />
            Dashboard
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
          <div className="p-6 rounded-xl bg-[#1c1c1e] border border-[#2c2c2e]">
            <Waves className="text-blue-500 mb-4" size={32} />
            <h3 className="text-white font-bold text-lg mb-2">Progressive Stitching</h3>
            <p className="text-slate-400 text-sm">Segments are seamlessly crossfaded and aligned at zero-crossings for perfect continuity.</p>
          </div>
          <div className="p-6 rounded-xl bg-[#1c1c1e] border border-[#2c2c2e]">
            <Cpu className="text-purple-500 mb-4" size={32} />
            <h3 className="text-white font-bold text-lg mb-2">Deterministic Orchestration</h3>
            <p className="text-slate-400 text-sm">Maintain tempo, key, and harmonic structure across multiple generation calls.</p>
          </div>
          <div className="p-6 rounded-xl bg-[#1c1c1e] border border-[#2c2c2e]">
            <Sparkles className="text-emerald-500 mb-4" size={32} />
            <h3 className="text-white font-bold text-lg mb-2">Continuous Playback</h3>
            <p className="text-slate-400 text-sm">Listen to the master file as it grows progressively without reloading the player.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
