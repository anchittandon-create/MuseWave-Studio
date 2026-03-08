import React, { useState } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import { Sparkles } from "lucide-react";

interface SuggestibleFieldProps {
  label: string;
  fieldName: string;
  context: any;
  onSelect: (val: string) => void;
  children: React.ReactNode;
}

export function SuggestibleField({ label, fieldName, context, onSelect, children }: SuggestibleFieldProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSuggest = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Suggest 5 creative options for the music production field "${fieldName}".
Context: ${JSON.stringify(context)}
Return a JSON array of 5 strings.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      });
      
      const parsed = JSON.parse(response.text || "[]");
      setSuggestions(parsed);
    } catch (e) {
      console.error("Suggestion error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-300">{label}</label>
        <button 
          type="button" 
          onClick={handleSuggest} 
          disabled={loading} 
          className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-indigo-300 px-2 py-1 rounded transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-3 h-3" />
          {loading ? "Generating..." : "AI Suggest"}
        </button>
      </div>
      {children}
      {suggestions.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-3 mt-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Suggestions</span>
            <button type="button" onClick={handleSuggest} className="text-xs text-indigo-400 hover:text-indigo-300">Regenerate</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button 
                key={i} 
                type="button" 
                onClick={() => { onSelect(s); setSuggestions([]); }} 
                className="text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-full text-left transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
