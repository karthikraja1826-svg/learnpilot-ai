import { useCallback, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { Checkbox } from '../../components/ui/Checkbox';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { TaskForm } from '../../components/academic/TaskForm';
import { useResource } from '../../hooks/useResource';
import { useToast } from '../../hooks/useToast';
import { listSubjects } from '../../services/subjects.service';
import { listTopics } from '../../services/topics.service';
import {
  createTask,
  deleteTask,
  listTasks,
  updateTask,
  updateTaskStatus,
  type TaskInput,
} from '../../services/tasks.service';
import type { Subject, Task, TaskPriority, TaskStatus, Topic } from '../../types/academic';

const PRIORITY_TONE: Record<TaskPriority, 'neutral' | 'warning' | 'error'> = {
  low: 'neutral',
  medium: 'warning',
  high: 'error',
  urgent: 'error',
};

function subjectName(subjects: Subject[], subjectId?: string | null): string | null {
  if (!subjectId) return null;
  return subjects.find((subject) => subject._id === subjectId)?.name ?? null;
}

function topicName(topics: Topic[], topicId?: string | null): string | null {
  if (!topicId) return null;
  return topics.find((topic) => topic._id === topicId)?.name ?? null;
}

function formatDueDate(iso?: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

type TaskModalState = { mode: 'create' } | { mode: 'edit'; task: Task } | null;

function TaskList({
  view,
  subjects,
  topics,
}: {
  view: 'all' | 'pending' | 'completed';
  subjects: Subject[];
  topics: Topic[];
}) {
  const statusParam: TaskStatus | undefined = view === 'pending' ? 'pending' : view === 'completed' ? 'completed' : undefined;
  const { data: tasks, isLoading, error, reload } = useResource(
    useCallback(() => listTasks(statusParam ? { status: statusParam } : {}), [statusParam]),
    [statusParam]
  );
  const { showToast } = useToast();
  const [modal, setModal] = useState<TaskModalState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleSubmit = async (input: TaskInput) => {
    if (modal?.mode === 'edit') {
      await updateTask(modal.task._id, input);
      showToast('Task updated.', 'success');
    } else {
      await createTask(input);
      showToast('Task added.', 'success');
    }
    setModal(null);
    reload();
  };

  const handleDelete = async (task: Task) => {
    try {
      await deleteTask(task._id);
      showToast(`${task.title} deleted.`, 'success');
      reload();
    } catch {
      showToast('Could not delete this task. Please try again.', 'error');
    }
  };

  const handleToggle = async (task: Task) => {
    setBusyId(task._id);
    try {
      await updateTaskStatus(task._id, task.status === 'completed' ? 'pending' : 'completed');
      reload();
    } catch {
      showToast('Could not update this task. Please try again.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const taskModal = (
    <Modal isOpen={modal !== null} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Edit Task' : 'Add Task'}>
      {modal && (
        <TaskForm
          subjects={subjects}
          topics={topics}
          initial={modal.mode === 'edit' ? modal.task : undefined}
          onSubmit={handleSubmit}
          onCancel={() => setModal(null)}
        />
      )}
    </Modal>
  );

  if (isLoading) return <LoadingState label="Loading tasks" />;
  if (error) return <ErrorState description={error} onRetry={reload} />;
  if ((tasks ?? []).length === 0) {
    return (
      <>
        <EmptyState
          title="You're all caught up."
          action={<Button size="sm" onClick={() => setModal({ mode: 'create' })}>Add Task</Button>}
        />
        {taskModal}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
          <Plus className="h-3.5 w-3.5" />
          Add Task
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {(tasks ?? []).map((task) => {
          const due = formatDueDate(task.dueDate);
          const subject = subjectName(subjects, task.subject);
          const topic = topicName(topics, task.topic);
          return (
            <Card key={task._id} padded={false} className="flex items-center gap-3 p-4">
              <Checkbox
                checked={task.status === 'completed'}
                onChange={() => handleToggle(task)}
                disabled={busyId === task._id}
                aria-label={`Mark ${task.title} ${task.status === 'completed' ? 'pending' : 'complete'}`}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={`truncate text-body font-medium ${task.status === 'completed' ? 'text-text-muted line-through' : ''}`}>
                  {task.title}
                </span>
                <span className="truncate text-caption">
                  {[subject, topic].filter(Boolean).join(' · ') || 'No subject'}
                  {due ? ` · Due ${due}` : ''}
                </span>
              </div>
              <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
              <div className="flex shrink-0 items-center gap-1">
                <IconButton aria-label={`Edit ${task.title}`} onClick={() => setModal({ mode: 'edit', task })}>
                  <Pencil className="h-4 w-4" />
                </IconButton>
                <IconButton aria-label={`Delete ${task.title}`} onClick={() => handleDelete(task)}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </Card>
          );
        })}
      </ul>

      {taskModal}
    </div>
  );
}

export function TasksPage() {
  const { data: subjects } = useResource(listSubjects, []);
  const { data: topics } = useResource(useCallback(() => listTopics(), []), []);

  const tabs: TabItem[] = [
    { id: 'all', label: 'All', content: <TaskList view="all" subjects={subjects ?? []} topics={topics ?? []} /> },
    {
      id: 'pending',
      label: 'Pending',
      content: <TaskList view="pending" subjects={subjects ?? []} topics={topics ?? []} />,
    },
    {
      id: 'completed',
      label: 'Completed',
      content: <TaskList view="completed" subjects={subjects ?? []} topics={topics ?? []} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-page-heading">Tasks</h1>
        <p className="text-secondary">Track the smaller steps that keep your study plan moving.</p>
      </div>
      <Tabs tabs={tabs} defaultTabId="all" />
    </div>
  );
}
