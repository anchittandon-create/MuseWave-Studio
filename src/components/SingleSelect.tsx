import React, { useState, useEffect, useRef } from 'react';

interface SingleSelectProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function SingleSelect({ options, value, onChange, placeholder }: SingleSelectProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [localOptions, setLocalOptions] = useState(options);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (!localOptions.includes(trimmed)) setLocalOptions([...localOptions, trimmed]);
    onChange(trimmed);
    setInputValue(trimmed);
    setIsOpen(false);
  };

  const filteredOptions = localOptions.filter(o => o.toLowerCase().includes(inputValue.toLowerCase()));

  return (
    <div className="relative" ref={containerRef}>
      <input 
        value={inputValue} 
        onChange={e => {
          setInputValue(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onKeyDown={e => { 
          if (e.key === 'Enter') { 
            e.preventDefault(); 
            handleSelect(inputValue); 
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
                onClick={() => handleSelect(o)}
              >
                {o}
              </div>
            ))
          ) : (
            inputValue && (
              <div 
                className="p-3 hover:bg-zinc-800 cursor-pointer text-sm text-indigo-400 transition-colors" 
                onClick={() => handleSelect(inputValue)}
              >
                Add "{inputValue}"
              </div>
            )
          )}
          {inputValue && filteredOptions.length > 0 && !localOptions.includes(inputValue) && (
            <div 
              className="p-3 hover:bg-zinc-800 cursor-pointer text-sm text-indigo-400 border-t border-zinc-800 transition-colors" 
              onClick={() => handleSelect(inputValue)}
            >
              Add "{inputValue}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
