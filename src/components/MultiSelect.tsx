import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({ options, value, onChange, placeholder }: MultiSelectProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [localOptions, setLocalOptions] = useState(options);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAdd = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (!localOptions.includes(trimmed)) setLocalOptions([...localOptions, trimmed]);
    if (!value.includes(trimmed)) onChange([...value, trimmed]);
    setInputValue("");
    setIsOpen(false);
  };

  const handleRemove = (val: string) => {
    onChange(value.filter(v => v !== val));
  };

  const filteredOptions = localOptions.filter(o => o.toLowerCase().includes(inputValue.toLowerCase()));

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map(v => (
          <span key={v} className="bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full text-sm flex items-center gap-1.5">
            {v}
            <button type="button" onClick={() => handleRemove(v)} className="hover:bg-indigo-500/30 rounded-full p-0.5 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <input 
        value={inputValue} 
        onChange={e => {
          setInputValue(e.target.value);
          setIsOpen(true);
        }}
        onKeyDown={e => { 
          if (e.key === 'Enter') { 
            e.preventDefault(); 
            handleAdd(inputValue); 
          } 
        }}
        placeholder={placeholder}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
        onFocus={() => setIsOpen(true)}
      />
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(o => (
              <div 
                key={o} 
                className="p-3 hover:bg-zinc-800 cursor-pointer text-sm text-zinc-300 transition-colors" 
                onClick={() => handleAdd(o)}
              >
                {o}
              </div>
            ))
          ) : (
            inputValue && (
              <div 
                className="p-3 hover:bg-zinc-800 cursor-pointer text-sm text-indigo-400 transition-colors" 
                onClick={() => handleAdd(inputValue)}
              >
                Add "{inputValue}"
              </div>
            )
          )}
          {inputValue && filteredOptions.length > 0 && !localOptions.includes(inputValue) && (
            <div 
              className="p-3 hover:bg-zinc-800 cursor-pointer text-sm text-indigo-400 border-t border-zinc-800 transition-colors" 
              onClick={() => handleAdd(inputValue)}
            >
              Add "{inputValue}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
