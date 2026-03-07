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
      <div className="fixed bottom-0 left-0 right-0 bg-[#1c1c1e] border-t border-[#2c2c2e] p-3 sm:p-4 flex items-center justify-between z-50 shadow-2xl transform transition-transform duration-300">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 cursor-pointer overflow-hidden" onClick={() => setIsExpanded(true)}>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-md flex items-center justify-center shadow-lg shrink-0">
            <span className="text-white font-bold text-base sm:text-lg">{currentTrack.trackName.charAt(0)}</span>
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-medium text-sm truncate">{currentTrack.trackName}</h3>
            <p className="text-slate-400 text-xs truncate">
              {Array.isArray(currentTrack.genres) ? currentTrack.genres.join(', ') : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 justify-center px-2 sm:px-4">
          <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shrink-0">
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end shrink-0">
          <button onClick={() => setIsExpanded(true)} className="hidden sm:block text-slate-400 hover:text-white transition-colors">
            <Maximize2 size={20} />
          </button>
          <button onClick={() => setIsPlayerOpen(false)} className="text-slate-400 hover:text-white transition-colors p-2">
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

      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-2xl mx-auto w-full">
        <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-96 md:h-96 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl shadow-blue-900/20 flex items-center justify-center mb-8 sm:mb-12 transform transition-transform hover:scale-105 duration-500">
           <span className="text-white font-bold text-5xl sm:text-6xl md:text-8xl opacity-50">{currentTrack.trackName.charAt(0)}</span>
        </div>

        <div className="w-full text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">{currentTrack.trackName}</h2>
          <p className="text-blue-400 text-base sm:text-lg">
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

        <div className="flex items-center justify-center gap-6 sm:gap-8">
          <button className="text-slate-400 hover:text-white transition-colors">
            <SkipBack size={24} className="sm:w-8 sm:h-8" />
          </button>
          <button 
            onClick={togglePlay}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-xl shadow-white/10"
          >
            {isPlaying ? <Pause size={24} className="sm:w-8 sm:h-8" /> : <Play size={24} className="ml-1 sm:ml-2 sm:w-8 sm:h-8" />}
          </button>
          <button className="text-slate-400 hover:text-white transition-colors">
            <SkipForward size={24} className="sm:w-8 sm:h-8" />
          </button>
        </div>
      </div>
    </div>
  );
}
