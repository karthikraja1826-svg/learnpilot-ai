import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import type { Assignment, PriorityLevel, Subject } from '../../types/academic';
import type { AssignmentInput } from '../../services/assignments.service';

interface AssignmentFormProps {
  subjects: Subject[];
  initial?: Assignment;
  onSubmit: (input: AssignmentInput) => Promise<void>;
  onCancel: () => void;
}

const toDatetimeLocal = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
};

export function AssignmentForm({ subjects, initial, onSubmit, onCancel }: AssignmentFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [subjectId, setSubjectId] = useState(initial?.subject ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [deadline, setDeadline] = useState(toDatetimeLocal(initial?.deadline));
  const [estimatedHours, setEstimatedHours] = useState(initial?.estimatedHours ?? 2);
  const [priority, setPriority] = useState<PriorityLevel>(initial?.priority ?? 'medium');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed'>(
    initial && initial.status !== 'overdue' ? initial.status : 'pending'
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (title.trim().length === 0) {
      setError('Assignment title is required.');
      return;
    }
    if (!deadline) {
      setError('Deadline is required.');
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
        title: title.trim(),
        subject: subjectId || null,
        description: description.trim(),
        deadline: new Date(deadline).toISOString(),
        estimatedHours,
        priority,
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
        label="Assignment title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="e.g. Lab Report 3"
        maxLength={150}
        autoFocus
      />
      <Select label="Subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
        <option value="">No subject</option>
        {subjects.map((subject) => (
          <option key={subject._id} value={subject._id}>
            {subject.name}
          </option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-4">
        <Input
          type="datetime-local"
          label="Deadline"
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
        />
        <Input
          type="number"
          label="Estimated hours"
          min={0.1}
          step={0.5}
          value={estimatedHours}
          onChange={(event) => setEstimatedHours(Number(event.target.value))}
        />
      </div>
      <Textarea
        label="Description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Optional details about this assignment"
        maxLength={1000}
      />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as PriorityLevel)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </Select>
        <Select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as 'pending' | 'in_progress' | 'completed')}
        >
          <option value="pending">Pending</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </Select>
      </div>

      {error && <p className="text-xs text-error">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {initial ? 'Save changes' : 'Add assignment'}
        </Button>
      </div>
    </form>
  );
}
