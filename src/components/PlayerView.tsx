import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, X, ChevronDown, Maximize2, Minimize2, SkipBack, SkipForward, Volume2 } from 'lucide-react';

export default function PlayerView() {
  const { 
    currentTrack, 
    isPlaying, 
    currentTime, 
    duration, 
    togglePlay, 
    seek, 
    isPlayerOpen, 
    setIsPlayerOpen 
  } = usePlayer();

  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!currentTrack || !isPlayerOpen) return null;

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    seek(time);
  };

  // Mini Player View
  if (!isExpanded) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-[#1c1c1e] border-t border-[#2c2c2e] p-4 flex items-center justify-between z-50 shadow-2xl transform transition-transform duration-300">
        <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => setIsExpanded(true)}>
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-md flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">{currentTrack.trackName.charAt(0)}</span>
          </div>
          <div>
            <h3 className="text-white font-medium text-sm">{currentTrack.trackName}</h3>
            <p className="text-slate-400 text-xs truncate max-w-[200px]">
              {Array.isArray(currentTrack.genres) ? currentTrack.genres.join(', ') : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 flex-1 justify-center">
          <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
          </button>
        </div>

        <div className="flex items-center gap-4 flex-1 justify-end">
          <button onClick={() => setIsExpanded(true)} className="text-slate-400 hover:text-white transition-colors">
            <Maximize2 size={20} />
          </button>
          <button onClick={() => setIsPlayerOpen(false)} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>
    );
  }

  // Expanded Full Player View
  return (
    <div className="fixed inset-0 bg-[#0a0a0a]/95 backdrop-blur-xl z-50 flex flex-col transition-all duration-300 animate-in slide-in-from-bottom-full">
      <div className="p-6 flex justify-between items-center">
        <button onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
          <ChevronDown size={28} />
        </button>
        <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">Now Playing</span>
        <button onClick={() => setIsPlayerOpen(false)} className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
          <X size={28} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto w-full">
        <div className="w-64 h-64 md:w-96 md:h-96 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl shadow-blue-900/20 flex items-center justify-center mb-12 transform transition-transform hover:scale-105 duration-500">
           <span className="text-white font-bold text-6xl md:text-8xl opacity-50">{currentTrack.trackName.charAt(0)}</span>
        </div>

        <div className="w-full text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">{currentTrack.trackName}</h2>
          <p className="text-blue-400 text-lg">
            {Array.isArray(currentTrack.genres) ? currentTrack.genres.join(', ') : ''}
          </p>
        </div>

        <div className="w-full mb-8">
          <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(currentTrack.durationRequested)}</span>
          </div>
          <div className="relative w-full h-2 bg-[#2c2c2e] rounded-full overflow-hidden group cursor-pointer">
            <div 
              className="absolute top-0 left-0 h-full bg-blue-500/30 transition-all duration-500"
              style={{ width: `${currentTrack.progressPercentage}%` }}
            />
            <div 
              className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-100"
              style={{ width: `${(currentTime / currentTrack.durationRequested) * 100}%` }}
            />
            <input
              type="range"
              min="0"
              max={currentTrack.durationRequested}
              value={currentTime}
              onChange={handleSeek}
              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-8">
          <button className="text-slate-400 hover:text-white transition-colors">
            <SkipBack size={32} />
          </button>
          <button 
            onClick={togglePlay}
            className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-xl shadow-white/10"
          >
            {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-2" />}
          </button>
          <button className="text-slate-400 hover:text-white transition-colors">
            <SkipForward size={32} />
          </button>
        </div>
      </div>
    </div>
  );
}
