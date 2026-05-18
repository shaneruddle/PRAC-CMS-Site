import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'th', label: 'Thai' },
  { code: 'ru', label: 'Russian' },
  { code: 'zh', label: 'Chinese' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
];

export function LanguageSwitcher({ selected, onSelect, completion }: { 
  selected: string, 
  onSelect: (code: string) => void,
  completion?: Record<string, boolean>
}) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
      {LANGUAGES.map((lang) => (
        <Button
          key={lang.code}
          variant={selected === lang.code ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onSelect(lang.code)}
          className={cn(
            "text-xs px-3 h-8",
            selected !== lang.code && "text-slate-500"
          )}
        >
          {lang.label}
          {completion && (
            <span className={cn(
              "ml-1.5 w-1.5 h-1.5 rounded-full",
              completion[lang.code] ? "bg-green-500" : "bg-slate-300"
            )} />
          )}
        </Button>
      ))}
    </div>
  );
}
