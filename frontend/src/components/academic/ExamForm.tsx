import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import type { Exam, PriorityLevel, Subject } from '../../types/academic';
import type { ExamInput } from '../../services/exams.service';

interface ExamFormProps {
  subjects: Subject[];
  initial?: Exam;
  onSubmit: (input: ExamInput) => Promise<void>;
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

export function ExamForm({ subjects, initial, onSubmit, onCancel }: ExamFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [subjectId, setSubjectId] = useState(initial?.subject ?? '');
  const [examDate, setExamDate] = useState(toDatetimeLocal(initial?.examDate));
  const [description, setDescription] = useState(initial?.description ?? '');
  const [priority, setPriority] = useState<PriorityLevel>(initial?.priority ?? 'medium');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (title.trim().length === 0) {
      setError('Exam title is required.');
      return;
    }
    if (!examDate) {
      setError('Exam date is required.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        subject: subjectId || null,
        examDate: new Date(examDate).toISOString(),
        description: description.trim(),
        priority,
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
        label="Exam title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="e.g. Midterm Exam"
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
      <Input
        type="datetime-local"
        label="Date & time"
        value={examDate}
        onChange={(event) => setExamDate(event.target.value)}
      />
      <Textarea
        label="Description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Optional details about this exam"
        maxLength={1000}
      />
      <Select label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as PriorityLevel)}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </Select>

      {error && <p className="text-xs text-error">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {initial ? 'Save changes' : 'Add exam'}
        </Button>
      </div>
    </form>
  );
}
