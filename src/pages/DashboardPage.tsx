import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, Download, Loader2, Music, Waves } from 'lucide-react';
import { usePlayer, Track } from '../context/PlayerContext';

function AudioPlayer({ track }: { track: Track }) {
  const { currentTrack, isPlaying, currentTime, playTrack, togglePlay } = usePlayer();
  
  const isThisTrackPlaying = currentTrack?.id === track.id;
  const displayTime = isThisTrackPlaying ? currentTime : 0;
  const displayIsPlaying = isThisTrackPlaying && isPlaying;

  const handlePlayClick = () => {
    if (isThisTrackPlaying) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  return (
    <div className="flex items-center gap-4 bg-[#121214] p-3 rounded-lg border border-[#2c2c2e]">
      <button
        onClick={handlePlayClick}
        disabled={!track.audioMasterUrl}
        className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {displayIsPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
      </button>
      
      <div className="flex-1">
        <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
          <span>{Math.floor(displayTime / 60)}:{(displayTime % 60).toFixed(0).padStart(2, '0')}</span>
          <span>{Math.floor(track.durationRequested / 60)}:{(track.durationRequested % 60).toString().padStart(2, '0')}</span>
        </div>
        <div className="h-1.5 bg-[#2c2c2e] rounded-full overflow-hidden relative">
          {/* Progress bar */}
          <div 
            className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(displayTime / track.durationRequested) * 100}%` }}
          />
          {/* Generation buffer bar */}
          <div 
            className="absolute top-0 left-0 h-full bg-blue-500/30 transition-all duration-500"
            style={{ width: `${track.progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTracks = async () => {
    try {
      const res = await fetch('/api/tracks');
      const data = await res.json();
      setTracks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
    const interval = setInterval(fetchTracks, 2000); // Poll for updates
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Global Library</h1>
          <p className="text-slate-400">Manage and monitor your deterministic generation pipelines.</p>
        </div>
      </div>

      <div className="space-y-4">
        {tracks.map(track => (
          <div key={track.id} className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 transition-all hover:border-[#3a3a3c]">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                      {track.trackName}
                      {track.status === 'generating' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 uppercase tracking-wider animate-pulse">
                          Generating
                        </span>
                      )}
                      {track.status === 'completed' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 uppercase tracking-wider">
                          Ready
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-slate-500 font-mono">
                      {new Date(track.createdAt).toLocaleString()} • {track.durationRequested}s
                    </p>
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    {Array.isArray(track.genres) && track.genres.map((g, i) => (
                      <span key={`${g}-${i}`} className="px-2 py-1 rounded bg-[#121214] border border-[#2c2c2e] text-xs font-medium text-slate-400 uppercase tracking-wider">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-slate-400 line-clamp-2">{track.prompt}</p>
                </div>

                {track.status === 'generating' && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-mono text-slate-500 mb-1">
                      <span>Pipeline Progress</span>
                      <span className="text-blue-400">{Math.round(track.progressPercentage)}%</span>
                    </div>
                    <div className="h-1.5 bg-[#121214] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500"
                        style={{ width: `${track.progressPercentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2 font-mono flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin" />
                      Stitching segment {track.segmentsGenerated + 1} of {Math.ceil(track.durationRequested / 30)}...
                    </p>
                  </div>
                )}

                <AudioPlayer track={track} />
              </div>

              <div className="flex flex-col justify-end gap-3 lg:w-48 shrink-0 border-t lg:border-t-0 lg:border-l border-[#2c2c2e] pt-4 lg:pt-0 lg:pl-6">
                <button 
                  disabled={track.status !== 'completed' || !track.audioMasterUrl}
                  onClick={() => {
                    if (track.audioMasterUrl) {
                      const a = document.createElement('a');
                      a.href = track.audioMasterUrl;
                      a.download = `${track.trackName}.wav`;
                      a.click();
                    }
                  }}
                  className="w-full py-2.5 bg-white text-[#121214] font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={18} />
                  Export WAV
                </button>
                <button 
                  disabled={track.status !== 'completed' || !track.audioMasterUrl}
                  onClick={() => {
                    if (track.audioMasterUrl) {
                      const mp3Url = track.audioMasterUrl.replace('.wav', '.mp3');
                      const a = document.createElement('a');
                      a.href = mp3Url;
                      a.download = `${track.trackName}.mp3`;
                      a.click();
                    }
                  }}
                  className="w-full py-2.5 bg-[#121214] border border-[#2c2c2e] text-slate-300 font-bold rounded-lg hover:text-white hover:border-slate-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Music size={18} />
                  Export MP3
                </button>
                {track.videoUrl && (
                  <button 
                    disabled={track.status !== 'completed'}
                    onClick={() => {
                      if (track.videoUrl) {
                        const a = document.createElement('a');
                        a.href = track.videoUrl;
                        a.download = `${track.trackName}.mp4`;
                        a.click();
                      }
                    }}
                    className="w-full py-2.5 bg-[#121214] border border-[#2c2c2e] text-slate-300 font-bold rounded-lg hover:text-white hover:border-slate-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={18} />
                    Export MP4
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {tracks.length === 0 && (
          <div className="text-center py-20 border border-dashed border-[#2c2c2e] rounded-xl bg-[#1c1c1e]/50">
            <Waves className="mx-auto text-slate-600 mb-4" size={48} />
            <h3 className="text-xl font-bold text-white mb-2">No tracks yet</h3>
            <p className="text-slate-400">Head over to the Create Music tab to start generating.</p>
          </div>
        )}
      </div>
    </div>
  );
}
