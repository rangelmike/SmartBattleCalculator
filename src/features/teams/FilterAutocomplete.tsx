import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import type { TeamSearchSuggestion } from "@/lib/pokemon/team-search";

type Completion = { value: string; caret: number };

type FilterAutocompleteProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  getSuggestions: (value: string, caret: number) => TeamSearchSuggestion[];
  complete: (value: string, caret: number, suggestion: string) => Completion;
};

export function FilterAutocomplete({
  label,
  value,
  onChange,
  placeholder,
  getSuggestions,
  complete
}: FilterAutocompleteProps) {
  const inputId = useId();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [caret, setCaret] = useState(value.length);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const suggestions = getSuggestions(value, caret);
  const showSuggestions = isOpen && suggestions.length > 0;

  function selectSuggestion(name: string) {
    const result = complete(value, caret, name);
    onChange(result.value);
    setCaret(result.caret);
    setActiveIndex(0);
    setIsOpen(false);
    inputRef.current?.focus();
    queueMicrotask(() => inputRef.current?.setSelectionRange(result.caret, result.caret));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }
    if (!showSuggestions) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]?.name ?? suggestions[0].name);
    }
  }

  return (
    <div className="relative min-w-0 flex-1" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
    }}>
      <label className="block text-sm font-medium" htmlFor={inputId}>{label}</label>
      <div className="relative mt-2">
        <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          id={inputId}
          className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setCaret(event.target.selectionStart ?? event.target.value.length);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onClick={(event) => {
            setCaret(event.currentTarget.selectionStart ?? value.length);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onKeyUp={(event) => {
            if (!["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
              setCaret(event.currentTarget.selectionStart ?? value.length);
            }
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls={showSuggestions ? listId : undefined}
          aria-activedescendant={showSuggestions ? `${listId}-${activeIndex}` : undefined}
        />
      </div>
      {showSuggestions ? (
        <div id={listId} role="listbox" aria-label={`${label} suggestions`} className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-background p-1 shadow-lg">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.name}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              type="button"
              className={`flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-sm ${index === activeIndex ? "bg-secondary" : "hover:bg-secondary"}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectSuggestion(suggestion.name)}
            >
              <span className="truncate font-medium">{suggestion.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{suggestion.teamCount} {suggestion.teamCount === 1 ? "team" : "teams"}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
