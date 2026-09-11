import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import type { Subject } from '../../types/academic';
import type { SubjectInput } from '../../services/subjects.service';

interface SubjectFormProps {
  initial?: Subject;
  onSubmit: (input: SubjectInput) => Promise<void>;
  onCancel: () => void;
}

const DEFAULT_COLOR = '#ca704b';

export function SubjectForm({ initial, onSubmit, onCancel }: SubjectFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 3);
  const [importance, setImportance] = useState(initial?.importance ?? 3);
  const [targetPerformance, setTargetPerformance] = useState(initial?.targetPerformance ?? 100);
  const [color, setColor] = useState(initial?.color ?? DEFAULT_COLOR);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (name.trim().length === 0) {
      setError('Subject name is required.');
      return;
    }
    if (name.trim().length > 100) {
      setError('Subject name must be at most 100 characters.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        difficulty,
        importance,
        targetPerformance,
        color,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Subject name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g. Organic Chemistry"
        maxLength={100}
        autoFocus
      />
      <Textarea
        label="Description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="What does this subject cover?"
        maxLength={1000}
      />
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Difficulty"
          value={difficulty}
          onChange={(event) => setDifficulty(Number(event.target.value))}
        >
          {[1, 2, 3, 4, 5].map((level) => (
            <option key={level} value={level}>
              {level} {level === 1 ? '(Easiest)' : level === 5 ? '(Hardest)' : ''}
            </option>
          ))}
        </Select>
        <Select
          label="Importance"
          value={importance}
          onChange={(event) => setImportance(Number(event.target.value))}
        >
          {[1, 2, 3, 4, 5].map((level) => (
            <option key={level} value={level}>
              {level} {level === 1 ? '(Low)' : level === 5 ? '(High)' : ''}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          type="number"
          label="Target performance (%)"
          min={0}
          max={100}
          value={targetPerformance}
          onChange={(event) => setTargetPerformance(Number(event.target.value))}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-label" htmlFor="subject-color">
            Color
          </label>
          <input
            id="subject-color"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-11 w-full cursor-pointer rounded-xl border border-border bg-surface px-1.5"
          />
        </div>
      </div>

      {error && <p className="text-xs text-error">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {initial ? 'Save changes' : 'Add subject'}
        </Button>
      </div>
    </form>
  );
}
