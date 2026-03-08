import React from 'react';
import { SuggestibleField } from './SuggestibleField';
import { MultiSelect } from './MultiSelect';
import { SingleSelect } from './SingleSelect';

export interface TrackFormState {
  trackName: string;
  prompt: string;
  genres: string[];
  moods: string[];
  tempoRange: [number, number];
  duration: number;
  lyrics: string;
  artistInspiration: string[];
  vocalLanguage: string;
  vocalStyle: string;
  structurePreference: string;
  energyLevel: number;
  creativityLevel: number;
  generateVideo: boolean;
  videoStyle: string;
  videoDescription: string;
}

export const initialTrackState: TrackFormState = {
  trackName: "",
  prompt: "",
  genres: [],
  moods: [],
  tempoRange: [120, 135],
  duration: 180,
  lyrics: "",
  artistInspiration: [],
  vocalLanguage: "Instrumental",
  vocalStyle: "Instrumental",
  structurePreference: "Standard",
  energyLevel: 5,
  creativityLevel: 5,
  generateVideo: false,
  videoStyle: "",
  videoDescription: ""
};

const genreOptions = ["Techno", "Hard Techno", "Industrial Techno", "Warehouse Techno", "Minimal Techno", "Peak Time Techno", "House", "Deep House", "Progressive House", "Dubstep", "Drum & Bass", "Hardstyle", "Ambient", "Synthwave", "Hip Hop", "Rock", "Jazz", "Classical"];
const moodOptions = ["Dark", "Epic", "Energetic", "Melancholic", "Hypnotic", "Dreamy", "Atmospheric", "Aggressive", "Industrial", "Futuristic"];
const durationOptions = [
  { label: "30 sec", value: 30 },
  { label: "1 min", value: 60 },
  { label: "2 min", value: 120 },
  { label: "3 min", value: 180 },
  { label: "4 min", value: 240 },
  { label: "5 min", value: 300 },
  { label: "10 min", value: 600 },
];
const artistOptions = ["Hans Zimmer", "Daft Punk", "Charlotte de Witte", "Eric Prydz", "Deadmau5", "Amelie Lens", "Tale of Us"];
const languageOptions = ["English", "Spanish", "French", "German", "Japanese", "Hindi", "Instrumental"];
const vocalStyleOptions = ["Male Vocal", "Female Vocal", "Robotic Vocal", "Choir", "Rap", "Instrumental"];
const structureOptions = ["Standard", "Verse Chorus", "Build Drop", "Ambient Flow", "Cinematic"];
const videoStyleOptions = ["Cinematic", "Cyberpunk", "Anime", "Abstract", "Retro", "AI Art"];

interface TrackFormProps {
  state: TrackFormState;
  onChange: (state: TrackFormState) => void;
  albumContext?: string;
  index?: number;
}

export function TrackForm({ state, onChange, albumContext, index }: TrackFormProps) {
  const update = (updates: Partial<TrackFormState>) => {
    onChange({ ...state, ...updates });
  };

  const getContext = () => {
    return {
      albumContext,
      trackName: state.trackName,
      prompt: state.prompt,
      genres: state.genres,
      moods: state.moods
    };
  };

  return (
    <div className="space-y-8 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
      {index !== undefined && (
        <h3 className="text-xl font-semibold text-white mb-4">Track {index + 1}</h3>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SuggestibleField 
          label="Track Name" 
          fieldName="Track Name" 
          context={getContext()} 
          onSelect={v => update({ trackName: v })}
        >
          <input 
            value={state.trackName} 
            onChange={e => update({ trackName: e.target.value })}
            placeholder="e.g. Neon Pulse"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </SuggestibleField>

        <SuggestibleField 
          label="Duration" 
          fieldName="Duration" 
          context={getContext()} 
          onSelect={v => {
            const opt = durationOptions.find(o => o.label === v);
            if (opt) update({ duration: opt.value });
          }}
        >
          <select 
            value={state.duration} 
            onChange={e => update({ duration: Number(e.target.value) })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {durationOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </SuggestibleField>
      </div>

      <SuggestibleField 
        label="Music Prompt" 
        fieldName="Music Prompt" 
        context={getContext()} 
        onSelect={v => update({ prompt: v })}
      >
        <textarea 
          value={state.prompt} 
          onChange={e => update({ prompt: e.target.value })}
          placeholder="Describe the sound, instruments, and vibe..."
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
        />
      </SuggestibleField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SuggestibleField 
          label="Genres" 
          fieldName="Genres" 
          context={getContext()} 
          onSelect={v => {
            if (!state.genres.includes(v)) update({ genres: [...state.genres, v] });
          }}
        >
          <MultiSelect 
            options={genreOptions} 
            value={state.genres} 
            onChange={v => update({ genres: v })} 
            placeholder="Select or type genres..."
          />
        </SuggestibleField>

        <SuggestibleField 
          label="Moods" 
          fieldName="Moods" 
          context={getContext()} 
          onSelect={v => {
            if (!state.moods.includes(v)) update({ moods: [...state.moods, v] });
          }}
        >
          <MultiSelect 
            options={moodOptions} 
            value={state.moods} 
            onChange={v => update({ moods: v })} 
            placeholder="Select or type moods..."
          />
        </SuggestibleField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SuggestibleField 
          label="Artist Inspiration" 
          fieldName="Artist Inspiration" 
          context={getContext()} 
          onSelect={v => {
            if (!state.artistInspiration.includes(v)) update({ artistInspiration: [...state.artistInspiration, v] });
          }}
        >
          <MultiSelect 
            options={artistOptions} 
            value={state.artistInspiration} 
            onChange={v => update({ artistInspiration: v })} 
            placeholder="Select or type artists..."
          />
        </SuggestibleField>

        <SuggestibleField 
          label="Structure Preference" 
          fieldName="Structure Preference" 
          context={getContext()} 
          onSelect={v => update({ structurePreference: v })}
        >
          <SingleSelect 
            options={structureOptions} 
            value={state.structurePreference} 
            onChange={v => update({ structurePreference: v })} 
            placeholder="Select structure..."
          />
        </SuggestibleField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SuggestibleField 
          label="Vocal Language" 
          fieldName="Vocal Language" 
          context={getContext()} 
          onSelect={v => update({ vocalLanguage: v })}
        >
          <SingleSelect 
            options={languageOptions} 
            value={state.vocalLanguage} 
            onChange={v => update({ vocalLanguage: v })} 
            placeholder="Select language..."
          />
        </SuggestibleField>

        <SuggestibleField 
          label="Vocal Style" 
          fieldName="Vocal Style" 
          context={getContext()} 
          onSelect={v => update({ vocalStyle: v })}
        >
          <SingleSelect 
            options={vocalStyleOptions} 
            value={state.vocalStyle} 
            onChange={v => update({ vocalStyle: v })} 
            placeholder="Select vocal style..."
          />
        </SuggestibleField>
      </div>

      <SuggestibleField 
        label="Lyrics" 
        fieldName="Lyrics" 
        context={getContext()} 
        onSelect={v => update({ lyrics: v })}
      >
        <textarea 
          value={state.lyrics} 
          onChange={e => update({ lyrics: e.target.value })}
          placeholder="Enter lyrics or leave blank for instrumental..."
          rows={4}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
        />
      </SuggestibleField>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SuggestibleField 
          label="Tempo Range (BPM)" 
          fieldName="Tempo Range" 
          context={getContext()} 
          onSelect={v => {
            const match = v.match(/(\d+)\s*-\s*(\d+)/);
            if (match) update({ tempoRange: [Number(match[1]), Number(match[2])] });
          }}
        >
          <div className="flex items-center gap-4">
            <input 
              type="number" 
              min="60" max="200" 
              value={state.tempoRange[0]} 
              onChange={e => update({ tempoRange: [Number(e.target.value), state.tempoRange[1]] })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
            />
            <span className="text-zinc-500">to</span>
            <input 
              type="number" 
              min="60" max="200" 
              value={state.tempoRange[1]} 
              onChange={e => update({ tempoRange: [state.tempoRange[0], Number(e.target.value)] })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </SuggestibleField>

        <SuggestibleField 
          label="Energy Level (1-10)" 
          fieldName="Energy Level" 
          context={getContext()} 
          onSelect={v => update({ energyLevel: Number(v) || 5 })}
        >
          <div className="flex items-center gap-4 h-[50px]">
            <input 
              type="range" 
              min="1" max="10" 
              value={state.energyLevel} 
              onChange={e => update({ energyLevel: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
            <span className="text-white font-mono w-6 text-center">{state.energyLevel}</span>
          </div>
        </SuggestibleField>

        <SuggestibleField 
          label="Creativity Level (1-10)" 
          fieldName="Creativity Level" 
          context={getContext()} 
          onSelect={v => update({ creativityLevel: Number(v) || 5 })}
        >
          <div className="flex items-center gap-4 h-[50px]">
            <input 
              type="range" 
              min="1" max="10" 
              value={state.creativityLevel} 
              onChange={e => update({ creativityLevel: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
            <span className="text-white font-mono w-6 text-center">{state.creativityLevel}</span>
          </div>
        </SuggestibleField>
      </div>

      <div className="pt-6 border-t border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <label className="text-lg font-medium text-white">Generate Music Video</label>
          <button 
            type="button"
            onClick={() => update({ generateVideo: !state.generateVideo })}
            className={`w-12 h-6 rounded-full transition-colors relative ${state.generateVideo ? 'bg-indigo-500' : 'bg-zinc-700'}`}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${state.generateVideo ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        {state.generateVideo && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
            <SuggestibleField 
              label="Video Style" 
              fieldName="Video Style" 
              context={getContext()} 
              onSelect={v => update({ videoStyle: v })}
            >
              <SingleSelect 
                options={videoStyleOptions} 
                value={state.videoStyle} 
                onChange={v => update({ videoStyle: v })} 
                placeholder="Select video style..."
              />
            </SuggestibleField>

            <SuggestibleField 
              label="Video Description Prompt" 
              fieldName="Video Description Prompt" 
              context={getContext()} 
              onSelect={v => update({ videoDescription: v })}
            >
              <textarea 
                value={state.videoDescription} 
                onChange={e => update({ videoDescription: e.target.value })}
                placeholder="Describe the visuals..."
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </SuggestibleField>
          </div>
        )}
      </div>
    </div>
  );
}
