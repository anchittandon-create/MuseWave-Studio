import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Wand2, Music, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const SuggestButton = ({ currentValue, onSuggest, isSuggesting }: { currentValue: any, onSuggest: (action: 'create'|'enhance') => void, isSuggesting: boolean }) => {
  const hasValue = Array.isArray(currentValue) ? currentValue.length > 0 : !!currentValue;

  if (isSuggesting) {
    return <Loader2 size={16} className="animate-spin text-blue-500" />;
  }

  if (!hasValue) {
    return (
      <button onClick={() => onSuggest('create')} className="text-blue-500 hover:text-blue-400 transition-colors" title="AI Suggest">
        <Wand2 size={16} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={() => onSuggest('enhance')} className="text-xs font-medium text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded" title="Enhance">
        <Sparkles size={12} /> Enhance
      </button>
      <button onClick={() => onSuggest('create')} className="text-xs font-medium text-purple-500 hover:text-purple-400 transition-colors flex items-center gap-1 bg-purple-500/10 px-2 py-1 rounded" title="Create New">
        <Wand2 size={12} /> New
      </button>
    </div>
  );
};

export default function CreateMusicPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'single' | 'album'>('single');
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    trackName: 'Untitled Project 01',
    albumName: 'Untitled Album',
    prompt: '',
    genres: [] as string[],
    moods: [] as string[],
    durationRequested: 60,
    tempoRange: 120,
    lyrics: '',
    vocalLanguage: 'English',
    vocalStyle: 'None',
    artistInspiration: '',
    structurePreference: 'Standard Pop',
    generateVideo: false,
    videoStyle: 'Abstract'
  });

  const [suggestingFields, setSuggestingFields] = useState<Set<string>>(new Set());
  const [expandedSongIndex, setExpandedSongIndex] = useState<number | null>(0);
  const [numSongs, setNumSongs] = useState(3);
  const [albumSongs, setAlbumSongs] = useState(
    Array.from({ length: 3 }, (_, i) => ({ title: `Track ${i + 1}`, prompt: '' }))
  );

  const handleNumSongsChange = (val: number) => {
    setNumSongs(val);
    setAlbumSongs(prev => {
      const newSongs = [...prev];
      if (val > prev.length) {
        for (let i = prev.length; i < val; i++) {
          newSongs.push({ title: `Track ${i + 1}`, prompt: '' });
        }
      } else {
        newSongs.splice(val);
      }
      return newSongs;
    });
  };

  const handleSuggest = async (fieldName: string, action: 'create' | 'enhance' = 'create', songIndex?: number) => {
    const fieldKey = songIndex !== undefined ? `song-${songIndex}-${fieldName}` : fieldName;
    setSuggestingFields(prev => new Set(prev).add(fieldKey));
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let currentValue: any = '';
      if (fieldName === 'numSongs') {
        currentValue = numSongs;
      } else if (songIndex !== undefined) {
        currentValue = albumSongs[songIndex][fieldName as keyof typeof albumSongs[0]];
      } else {
        currentValue = formData[fieldName as keyof typeof formData];
      }

      let prompt = '';
      if (action === 'enhance') {
         prompt = `You are an AI music producer assistant. Enhance the following value for the field "${fieldName}". Current value: "${currentValue}". Context: ${JSON.stringify(formData)}. Return ONLY the enhanced text, nothing else. Keep it concise.`;
      } else {
         prompt = `You are an AI music producer assistant. Suggest a creative value for the field "${fieldName}". Context: ${JSON.stringify(formData)}. Return ONLY the suggested text, nothing else. Keep it concise.`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt
      });
      if (response.text) {
        let suggestedValue: any = response.text?.trim();
        if (fieldName === 'genres' || fieldName === 'moods') {
          try {
            if (suggestedValue.startsWith('[')) {
              suggestedValue = JSON.parse(suggestedValue);
            } else {
              suggestedValue = suggestedValue.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          } catch (e) {
            suggestedValue = [suggestedValue];
          }
        } else if (fieldName === 'numSongs' || fieldName === 'durationRequested' || fieldName === 'tempoRange') {
          const num = parseInt(suggestedValue.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num)) {
            suggestedValue = num;
          }
        }
        
        if (fieldName === 'numSongs') {
          handleNumSongsChange(Math.min(Math.max(suggestedValue as number, 2), 10));
        } else if (songIndex !== undefined) {
          setAlbumSongs(prev => {
            const newSongs = [...prev];
            newSongs[songIndex] = { ...newSongs[songIndex], [fieldName]: suggestedValue };
            return newSongs;
          });
        } else {
          setFormData(prev => ({ ...prev, [fieldName]: suggestedValue }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSuggestingFields(prev => {
        const next = new Set(prev);
        next.delete(fieldKey);
        return next;
      });
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const trackIds = [];
      
      if (mode === 'single') {
        const res = await fetch('/api/tracks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const { id } = await res.json();
        trackIds.push({ id, trackName: formData.trackName, prompt: formData.prompt });
      } else {
        for (const song of albumSongs) {
          const fullTrackName = `${formData.albumName} - ${song.title}`;
          const res = await fetch('/api/tracks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...formData,
              trackName: fullTrackName,
              prompt: song.prompt
            })
          });
          const { id } = await res.json();
          trackIds.push({ id, trackName: fullTrackName, prompt: song.prompt });
        }
      }
      
      navigate('/dashboard');

      // Start generation loop in background
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const durationRequested = formData.durationRequested;
      const segmentsNeeded = Math.ceil(durationRequested / 30);

      for (const track of trackIds) {
        let durationGenerated = 0;
        for (let currentSegment = 0; currentSegment < segmentsNeeded; currentSegment++) {
          const segmentPrompt = `Generate segment ${currentSegment + 1} of ${segmentsNeeded} for track ${track.trackName}. Style: ${formData.genres.join(', ')}. Prompt: ${track.prompt}. Maintain tempo, key, rhythm continuity.`;
          
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
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
          const progressPercentage = Math.min((durationGenerated / durationRequested) * 100, 99);

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
    ? formData.trackName.trim() !== '' && formData.prompt.trim() !== '' 
    : formData.albumName.trim() !== '' && albumSongs.every(s => s.title.trim() !== '' && s.prompt.trim() !== '');

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Studio Console</h1>
          <p className="text-slate-400">Configure parameters for deterministic generation.</p>
        </div>
        
        <div className="flex items-center bg-[#1c1c1e] rounded-lg border border-[#2c2c2e] p-1">
          <button
            onClick={() => setMode('single')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === 'single' ? 'bg-[#2c2c2e] text-white shadow-sm' : 'text-slate-500 hover:text-white'
            }`}
          >
            Single Track
          </button>
          <button
            onClick={() => setMode('album')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === 'album' ? 'bg-[#2c2c2e] text-white shadow-sm' : 'text-slate-500 hover:text-white'
            }`}
          >
            Album Mode
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {mode === 'single' ? (
            <>
              <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Track Title <span className="text-red-500">*</span></label>
                  <SuggestButton 
                    currentValue={formData.trackName}
                    onSuggest={(action) => handleSuggest('trackName', action)}
                    isSuggesting={suggestingFields.has('trackName')}
                  />
                </div>
                <input
                  type="text"
                  value={formData.trackName}
                  onChange={e => setFormData({...formData, trackName: e.target.value})}
                  className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg p-3 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Music Prompt <span className="text-red-500">*</span></label>
                  <SuggestButton 
                    currentValue={formData.prompt}
                    onSuggest={(action) => handleSuggest('prompt', action)}
                    isSuggesting={suggestingFields.has('prompt')}
                  />
                </div>
                <textarea
                  value={formData.prompt}
                  onChange={e => setFormData({...formData, prompt: e.target.value})}
                  placeholder="Describe the atmosphere, instruments, and progression..."
                  className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg p-3 text-white h-32 resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          ) : (
            <>
              <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Album Name <span className="text-red-500">*</span></label>
                  <SuggestButton 
                    currentValue={formData.albumName}
                    onSuggest={(action) => handleSuggest('albumName', action)}
                    isSuggesting={suggestingFields.has('albumName')}
                  />
                </div>
                <input
                  type="text"
                  value={formData.albumName}
                  onChange={e => setFormData({...formData, albumName: e.target.value})}
                  className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg p-3 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-6"
                />

                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Number of Songs</label>
                  <div className="flex items-center gap-4">
                    <SuggestButton 
                      currentValue={numSongs}
                      onSuggest={(action) => handleSuggest('numSongs', action)}
                      isSuggesting={suggestingFields.has('numSongs')}
                    />
                    <span className="text-blue-400 font-mono text-xl font-bold">{numSongs}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={numSongs}
                  onChange={e => handleNumSongsChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#121214] rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                  <span>2</span>
                  <span>10</span>
                </div>
              </div>

              <div className="space-y-4">
                {albumSongs.map((song, index) => (
                  <div key={index} className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedSongIndex(expandedSongIndex === index ? null : index)}
                      className="w-full flex items-center justify-between p-4 bg-[#232325] hover:bg-[#2a2a2d] transition-colors"
                    >
                      <span className="font-bold text-white flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                          {index + 1}
                        </span>
                        {song.title || `Track ${index + 1}`}
                      </span>
                      {expandedSongIndex === index ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                    </button>
                    
                    {expandedSongIndex === index && (
                      <div className="p-6 border-t border-[#2c2c2e]">
                        <div className="flex justify-between items-center mb-4">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Song Title <span className="text-red-500">*</span></label>
                          <SuggestButton 
                            currentValue={song.title}
                            onSuggest={(action) => handleSuggest('title', action, index)}
                            isSuggesting={suggestingFields.has(`song-${index}-title`)}
                          />
                        </div>
                        <input
                          type="text"
                          value={song.title}
                          onChange={e => {
                            const newSongs = [...albumSongs];
                            newSongs[index].title = e.target.value;
                            setAlbumSongs(newSongs);
                          }}
                          className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg p-3 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-6"
                        />

                        <div className="flex justify-between items-center mb-4">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Song Prompt <span className="text-red-500">*</span></label>
                          <SuggestButton 
                            currentValue={song.prompt}
                            onSuggest={(action) => handleSuggest('prompt', action, index)}
                            isSuggesting={suggestingFields.has(`song-${index}-prompt`)}
                          />
                        </div>
                        <textarea
                          value={song.prompt}
                          onChange={e => {
                            const newSongs = [...albumSongs];
                            newSongs[index].prompt = e.target.value;
                            setAlbumSongs(newSongs);
                          }}
                          placeholder={`Describe the atmosphere for song ${index + 1}...`}
                          className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg p-3 text-white h-24 resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duration Control</label>
              <div className="flex items-center gap-4">
                <SuggestButton 
                  currentValue={formData.durationRequested}
                  onSuggest={(action) => handleSuggest('durationRequested', action)}
                  isSuggesting={suggestingFields.has('durationRequested')}
                />
                <span className="text-blue-400 font-mono text-xl font-bold">{formData.durationRequested}s</span>
              </div>
            </div>
            <input
              type="range"
              min="30"
              max="300"
              step="30"
              value={formData.durationRequested}
              onChange={e => setFormData({...formData, durationRequested: parseInt(e.target.value)})}
              className="w-full h-2 bg-[#121214] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
              <span>30s</span>
              <span>150s</span>
              <span>300s</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Genre Tags</label>
              <SuggestButton 
                currentValue={formData.genres}
                onSuggest={(action) => handleSuggest('genres', action)}
                isSuggesting={suggestingFields.has('genres')}
              />
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {Array.from(new Set([...formData.genres, 'Synthwave', 'Cinematic', 'Dark Ambient', 'Techno', 'Lo-Fi'])).map(genre => (
                <button
                  key={genre}
                  onClick={() => {
                    const newGenres = formData.genres.includes(genre)
                      ? formData.genres.filter(g => g !== genre)
                      : [...formData.genres, genre];
                    setFormData({...formData, genres: newGenres});
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    formData.genres.includes(genre)
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'bg-[#121214] text-slate-400 border border-[#2c2c2e] hover:border-slate-500 hover:text-white'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add custom genre..."
              className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              onKeyDown={e => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  setFormData({...formData, genres: [...formData.genres, e.currentTarget.value]});
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>

          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6">
             <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tempo (BPM)</label>
              <div className="flex items-center gap-4">
                <SuggestButton 
                  currentValue={formData.tempoRange}
                  onSuggest={(action) => handleSuggest('tempoRange', action)}
                  isSuggesting={suggestingFields.has('tempoRange')}
                />
                <span className="text-white font-mono">{formData.tempoRange}</span>
              </div>
            </div>
            <input
              type="range"
              min="60"
              max="200"
              value={formData.tempoRange}
              onChange={e => setFormData({...formData, tempoRange: parseInt(e.target.value)})}
              className="w-full h-2 bg-[#121214] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !isFormValid}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
          >
            {isGenerating ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <Sparkles size={24} className="animate-pulse" />
            )}
            {isGenerating ? 'Initializing Pipeline...' : 'Initialize Generation'}
          </button>
        </div>
      </div>
    </div>
  );
}
