import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import type { Subject, Task, TaskPriority, Topic } from '../../types/academic';
import type { TaskInput } from '../../services/tasks.service';

interface TaskFormProps {
  subjects: Subject[];
  topics: Topic[];
  initial?: Task;
  onSubmit: (input: TaskInput) => Promise<void>;
  onCancel: () => void;
}

const toDatetimeLocal = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
};

export function TaskForm({ subjects, topics, initial, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [subjectId, setSubjectId] = useState(initial?.subject ?? '');
  const [topicId, setTopicId] = useState(initial?.topic ?? '');
  const [dueDate, setDueDate] = useState(toDatetimeLocal(initial?.dueDate));
  const [estimatedMinutes, setEstimatedMinutes] = useState(initial?.estimatedMinutes ?? 30);
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? 'medium');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topicsForSubject = useMemo(
    () => (subjectId ? topics.filter((topic) => topic.subject === subjectId) : []),
    [topics, subjectId]
  );

  const handleSubjectChange = (nextSubjectId: string) => {
    setSubjectId(nextSubjectId);
    if (topicId && !topics.some((topic) => topic._id === topicId && topic.subject === nextSubjectId)) {
      setTopicId('');
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (title.trim().length === 0) {
      setError('Task title is required.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        subject: subjectId || null,
        topic: topicId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        estimatedMinutes: estimatedMinutes || null,
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
        label="Task title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="e.g. Review flashcards"
        maxLength={150}
        autoFocus
      />
      <Textarea
        label="Description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Optional details"
        maxLength={1000}
      />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Subject" value={subjectId} onChange={(event) => handleSubjectChange(event.target.value)}>
          <option value="">No subject</option>
          {subjects.map((subject) => (
            <option key={subject._id} value={subject._id}>
              {subject.name}
            </option>
          ))}
        </Select>
        <Select
          label="Topic"
          value={topicId}
          onChange={(event) => setTopicId(event.target.value)}
          disabled={!subjectId}
        >
          <option value="">No topic</option>
          {topicsForSubject.map((topic) => (
            <option key={topic._id} value={topic._id}>
              {topic.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          type="datetime-local"
          label="Due date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
        <Input
          type="number"
          label="Estimated minutes"
          min={1}
          value={estimatedMinutes}
          onChange={(event) => setEstimatedMinutes(Number(event.target.value))}
        />
      </div>
      <Select label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </Select>

      {error && <p className="text-xs text-error">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {initial ? 'Save changes' : 'Add task'}
        </Button>
      </div>
    </form>
  );
}
