import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import type { Topic, TopicStatus } from '../../types/academic';
import type { TopicInput } from '../../services/topics.service';

interface TopicFormProps {
  subjectId: string;
  initial?: Topic;
  onSubmit: (input: TopicInput) => Promise<void>;
  onCancel: () => void;
}

const STATUS_OPTIONS: { value: TopicStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'needs_revision', label: 'Needs revision' },
];

export function TopicForm({ subjectId, initial, onSubmit, onCancel }: TopicFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 3);
  const [estimatedHours, setEstimatedHours] = useState(initial?.estimatedHours ?? 2);
  const [currentMastery, setCurrentMastery] = useState(initial?.currentMastery ?? 0);
  const [targetMastery, setTargetMastery] = useState(initial?.targetMastery ?? 100);
  const [status, setStatus] = useState<TopicStatus>(initial?.status ?? 'not_started');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (name.trim().length === 0) {
      setError('Topic name is required.');
      return;
    }
    if (!Number.isFinite(estimatedHours) || estimatedHours <= 0) {
      setError('Estimated hours must be a positive number.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        subject: subjectId,
        name: name.trim(),
        description: description.trim(),
        difficulty,
        estimatedHours,
        currentMastery,
        targetMastery,
        status,
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
        label="Topic name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g. Reaction mechanisms"
        maxLength={150}
        autoFocus
      />
      <Textarea
        label="Description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Optional notes about this topic"
        maxLength={1000}
      />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Difficulty" value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))}>
          {[1, 2, 3, 4, 5].map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </Select>
        <Input
          type="number"
          label="Estimated hours"
          min={0.1}
          step={0.5}
          value={estimatedHours}
          onChange={(event) => setEstimatedHours(Number(event.target.value))}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          type="number"
          label="Current mastery (%)"
          min={0}
          max={100}
          value={currentMastery}
          onChange={(event) => setCurrentMastery(Number(event.target.value))}
        />
        <Input
          type="number"
          label="Target mastery (%)"
          min={0}
          max={100}
          value={targetMastery}
          onChange={(event) => setTargetMastery(Number(event.target.value))}
        />
      </div>
      <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value as TopicStatus)}>
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      {error && <p className="text-xs text-error">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {initial ? 'Save changes' : 'Add topic'}
        </Button>
      </div>
    </form>
  );
}
