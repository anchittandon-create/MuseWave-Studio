import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Wand2, Music, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

export default function CreateMusicPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'single' | 'album'>('single');
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    trackName: 'Untitled Project 01',
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

  const [suggestingField, setSuggestingField] = useState<string | null>(null);
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

  const handleSuggest = async (fieldName: string) => {
    setSuggestingField(fieldName);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `You are an AI music producer assistant. Suggest a creative value for the field "${fieldName}". Current value: "${formData[fieldName as keyof typeof formData]}". Context: ${JSON.stringify(formData)}. Return ONLY the suggested text, nothing else. Keep it concise.`
      });
      if (response.text) {
        setFormData(prev => ({ ...prev, [fieldName]: response.text?.trim() }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSuggestingField(null);
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
          const res = await fetch('/api/tracks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...formData,
              trackName: song.title,
              prompt: song.prompt
            })
          });
          const { id } = await res.json();
          trackIds.push({ id, trackName: song.title, prompt: song.prompt });
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
    ? formData.prompt.trim() !== '' 
    : albumSongs.every(s => s.prompt.trim() !== '');

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
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Track Title</label>
                  <button 
                    onClick={() => handleSuggest('trackName')}
                    className="text-blue-500 hover:text-blue-400 transition-colors"
                    title="AI Suggest"
                  >
                    {suggestingField === 'trackName' ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  </button>
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
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Music Prompt</label>
                  <button 
                    onClick={() => handleSuggest('prompt')}
                    className="text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    {suggestingField === 'prompt' ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  </button>
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
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Number of Songs</label>
                  <span className="text-blue-400 font-mono text-xl font-bold">{numSongs}</span>
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

              {albumSongs.map((song, index) => (
                <div key={index} className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Song {index + 1} Title</label>
                  </div>
                  <input
                    type="text"
                    value={song.title}
                    onChange={e => {
                      const newSongs = [...albumSongs];
                      newSongs[index].title = e.target.value;
                      setAlbumSongs(newSongs);
                    }}
                    className="w-full bg-[#121214] border border-[#2c2c2e] rounded-lg p-3 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-4"
                  />

                  <div className="flex justify-between items-center mb-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Song {index + 1} Prompt</label>
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
              ))}
            </>
          )}

          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duration Control</label>
              <span className="text-blue-400 font-mono text-xl font-bold">{formData.durationRequested}s</span>
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
              <button 
                onClick={() => handleSuggest('genres')}
                className="text-blue-500 hover:text-blue-400 transition-colors"
              >
                {suggestingField === 'genres' ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {['Synthwave', 'Cinematic', 'Dark Ambient', 'Techno', 'Lo-Fi'].map(genre => (
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
              <span className="text-white font-mono">{formData.tempoRange}</span>
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
