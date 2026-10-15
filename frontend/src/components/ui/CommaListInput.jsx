import { useEffect, useState } from 'react';
import Input from './Input';

/**
 * Text input for a comma-separated list (tags, choices, features).
 * Keeps the raw text while typing and converts to an array on change,
 * so commas and spaces can be typed naturally.
 */
export default function CommaListInput({ value = [], onChange, max = 30, ...props }) {
  const [text, setText] = useState(value.join(', '));

  useEffect(() => {
    const parsed = text.split(',').map((s) => s.trim()).filter(Boolean);
    if (parsed.join('|') !== value.join('|')) setText(value.join(', '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.join('|')]);

  return (
    <Input
      {...props}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, max));
      }}
      onBlur={() => setText(value.join(', '))}
    />
  );
}
