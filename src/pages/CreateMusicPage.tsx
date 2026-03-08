import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { TrackForm, TrackFormState, initialTrackState } from '../components/TrackForm';
import { SuggestibleField } from '../components/SuggestibleField';

export interface AlbumFormState {
  albumName: string;
  albumVibePrompt: string;
  numberOfSongs: number;
  tracks: TrackFormState[];
}

const initialAlbumState: AlbumFormState = {
  albumName: "",
  albumVibePrompt: "",
  numberOfSongs: 2,
  tracks: [initialTrackState, initialTrackState]
};

export default function CreateMusicPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'single' | 'album'>('single');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [singleTrackState, setSingleTrackState] = useState<TrackFormState>(initialTrackState);
  const [albumState, setAlbumState] = useState<AlbumFormState>(initialAlbumState);
  
  const [expandedSongIndex, setExpandedSongIndex] = useState<number | null>(0);

  const handleNumSongsChange = (val: number) => {
    setAlbumState(prev => {
      const newTracks = [...prev.tracks];
      if (val > prev.tracks.length) {
        for (let i = prev.tracks.length; i < val; i++) {
          newTracks.push(initialTrackState);
        }
      } else {
        newTracks.splice(val);
      }
      return { ...prev, numberOfSongs: val, tracks: newTracks };
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const trackIds = [];
      
      if (mode === 'single') {
        const res = await fetch('/api/tracks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trackName: singleTrackState.trackName,
            prompt: singleTrackState.prompt,
            genres: singleTrackState.genres,
            durationRequested: singleTrackState.duration
          })
        });
        const { id } = await res.json();
        trackIds.push({ 
          id, 
          trackName: singleTrackState.trackName, 
          prompt: singleTrackState.prompt,
          genres: singleTrackState.genres,
          durationRequested: singleTrackState.duration
        });
      } else {
        for (const track of albumState.tracks) {
          const fullTrackName = `${albumState.albumName} - ${track.trackName || 'Untitled'}`;
          const effectivePrompt = `${albumState.albumVibePrompt}\n\n${track.prompt}`;
          const res = await fetch('/api/tracks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              trackName: fullTrackName,
              prompt: effectivePrompt,
              genres: track.genres,
              durationRequested: track.duration
            })
          });
          const { id } = await res.json();
          trackIds.push({ 
            id, 
            trackName: fullTrackName, 
            prompt: effectivePrompt,
            genres: track.genres,
            durationRequested: track.duration
          });
        }
      }
      
      navigate('/dashboard');

      // Start generation loop in background
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      for (const track of trackIds) {
        let durationGenerated = 0;
        const segmentsNeeded = Math.ceil(track.durationRequested / 30);

        for (let currentSegment = 0; currentSegment < segmentsNeeded; currentSegment++) {
          const segmentPrompt = `Generate segment ${currentSegment + 1} of ${segmentsNeeded} for track ${track.trackName}. Style: ${track.genres.join(', ')}. Prompt: ${track.prompt}. Maintain tempo, key, rhythm continuity.`;
          
          const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: [{ parts: [{ text: segmentPrompt }] }],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
              }
            }
          });
          
          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (!base64Audio) throw new Error('No audio generated');

          durationGenerated += 30;
          const progressPercentage = Math.min((durationGenerated / track.durationRequested) * 100, 99);

          await fetch(`/api/tracks/${track.id}/segment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Audio,
              currentSegment,
              durationGenerated,
              progressPercentage
            })
          });
        }

        await fetch(`/api/tracks/${track.id}/finalize`, { method: 'POST' });
      }

    } catch (err) {
      console.error(err);
      setIsGenerating(false);
    }
  };

  const isFormValid = mode === 'single' 
    ? singleTrackState.trackName.trim() !== '' && singleTrackState.prompt.trim() !== '' 
    : albumState.albumName.trim() !== '' && albumState.tracks.every(s => s.trackName.trim() !== '' && s.prompt.trim() !== '');

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Studio Console</h1>
          <p className="text-sm sm:text-base text-slate-400">Configure parameters for deterministic generation.</p>
        </div>
        
        <div className="flex items-center bg-zinc-900 rounded-lg border border-zinc-800 p-1 w-full sm:w-auto">
          <button
            onClick={() => setMode('single')}
            className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium rounded-md transition-colors ${
              mode === 'single' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Song
          </button>
          <button
            onClick={() => setMode('album')}
            className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium rounded-md transition-colors ${
              mode === 'album' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Album
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {mode === 'single' ? (
          <TrackForm 
            state={singleTrackState} 
            onChange={setSingleTrackState} 
          />
        ) : (
          <div className="space-y-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
              <h2 className="text-xl font-semibold text-white">Album Details</h2>
              
              <SuggestibleField 
                label="Album Name" 
                fieldName="Album Name" 
                context={{ albumVibePrompt: albumState.albumVibePrompt }} 
                onSelect={v => setAlbumState(prev => ({ ...prev, albumName: v }))}
              >
                <input
                  type="text"
                  value={albumState.albumName}
                  onChange={e => setAlbumState(prev => ({ ...prev, albumName: e.target.value }))}
                  placeholder="e.g. Echoes of Tomorrow"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </SuggestibleField>

              <SuggestibleField 
                label="Album Vibe Prompt" 
                fieldName="Album Vibe Prompt" 
                context={{ albumName: albumState.albumName }} 
                onSelect={v => setAlbumState(prev => ({ ...prev, albumVibePrompt: v }))}
              >
                <textarea
                  value={albumState.albumVibePrompt}
                  onChange={e => setAlbumState(prev => ({ ...prev, albumVibePrompt: e.target.value }))}
                  placeholder="Describe the overall sonic identity of the album..."
                  rows={4}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </SuggestibleField>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Number of Songs</label>
                <select
                  value={albumState.numberOfSongs}
                  onChange={e => handleNumSongsChange(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {[2, 3, 4, 5, 10, 20].map(n => (
                    <option key={n} value={n}>{n} Songs</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Track Configuration</h2>
              {albumState.tracks.map((track, index) => (
                <div key={index} className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedSongIndex(expandedSongIndex === index ? null : index)}
                    className="w-full flex items-center justify-between p-4 bg-zinc-900/50 hover:bg-zinc-800/80 transition-colors"
                  >
                    <span className="font-bold text-white flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm">
                        {index + 1}
                      </span>
                      {track.trackName || `Track ${index + 1}`}
                    </span>
                    {expandedSongIndex === index ? <ChevronUp size={20} className="text-zinc-400" /> : <ChevronDown size={20} className="text-zinc-400" />}
                  </button>
                  
                  {expandedSongIndex === index && (
                    <div className="p-6 border-t border-zinc-800 bg-zinc-900/20">
                      <TrackForm 
                        state={track} 
                        onChange={newState => {
                          setAlbumState(prev => {
                            const newTracks = [...prev.tracks];
                            newTracks[index] = newState;
                            return { ...prev, tracks: newTracks };
                          });
                        }}
                        albumContext={albumState.albumVibePrompt}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !isFormValid}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.01]"
        >
          {isGenerating ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <Sparkles size={24} />
          )}
          {isGenerating ? 'Initializing Pipeline...' : 'Initialize Generation'}
        </button>
      </div>
    </div>
  );
}

