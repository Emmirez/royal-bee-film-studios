import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

/**
 * Repeating rows editor (process steps, packages, FAQs, credits…).
 * renderRow(item, update(patch), index) renders the fields for one row.
 */
export function ListEditor({ items = [], onChange, renderRow, newItem, addLabel = 'Add', max = 50, emptyText = 'Nothing added yet.' }) {
  const update = (i, patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const move = (i, d) => {
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="rounded-xl border border-dashed border-app-border px-4 py-5 text-center text-sm text-app-subtle">{emptyText}</p>}
      {items.map((item, i) => (
        <div key={item._id || i} className="flex gap-3 rounded-xl border border-app-border bg-app-raised p-4">
          <div className="min-w-0 flex-1 space-y-3">{renderRow(item, (patch) => update(i, patch), i)}</div>
          <div className="flex flex-col gap-1">
            <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-md p-1.5 text-app-subtle hover:bg-app-muted disabled:opacity-30" aria-label="Move up">
              <ArrowUp className="h-4 w-4" />
            </button>
            <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="rounded-md p-1.5 text-app-subtle hover:bg-app-muted disabled:opacity-30" aria-label="Move down">
              <ArrowDown className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => remove(i)} className="rounded-md p-1.5 text-status-danger hover:bg-status-danger/10" aria-label="Remove row">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      {items.length < max && (
        <Button variant="secondary" size="sm" icon={Plus} onClick={() => onChange([...items, typeof newItem === 'function' ? newItem() : { ...newItem }])}>
          {addLabel}
        </Button>
      )}
    </div>
  );
}

/** Simple list of strings (benefits, deliverables, tags, paragraphs). */
export function StringListEditor({ items = [], onChange, placeholder, addLabel = 'Add item', multiline = false, max = 30 }) {
  return (
    <ListEditor
      items={items.map((text) => ({ text }))}
      onChange={(rows) => onChange(rows.map((r) => r.text))}
      newItem={{ text: '' }}
      addLabel={addLabel}
      max={max}
      renderRow={(row, update) =>
        multiline ? (
          <textarea
            rows={4}
            value={row.text}
            placeholder={placeholder}
            onChange={(e) => update({ text: e.target.value })}
            className="w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text focus:border-app-accent focus:outline-none"
            aria-label={placeholder || 'Text'}
          />
        ) : (
          <Input value={row.text} placeholder={placeholder} onChange={(e) => update({ text: e.target.value })} aria-label={placeholder || 'Item'} />
        )
      }
    />
  );
}
