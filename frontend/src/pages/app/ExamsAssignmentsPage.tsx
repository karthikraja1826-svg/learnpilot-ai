import { useCallback, useState } from 'react';
import { Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ExamForm } from '../../components/academic/ExamForm';
import { AssignmentForm } from '../../components/academic/AssignmentForm';
import { useResource } from '../../hooks/useResource';
import { useToast } from '../../hooks/useToast';
import { listSubjects } from '../../services/subjects.service';
import {
  createExam,
  deleteExam,
  listExams,
  updateExam,
  type ExamInput,
  type ListExamsParams,
} from '../../services/exams.service';
import {
  createAssignment,
  deleteAssignment,
  listAssignments,
  updateAssignment,
  type AssignmentInput,
  type ListAssignmentsParams,
} from '../../services/assignments.service';
import type { Assignment, Exam, PriorityLevel, Subject } from '../../types/academic';

const PRIORITY_TONE: Record<PriorityLevel, 'neutral' | 'warning' | 'error'> = {
  low: 'neutral',
  medium: 'warning',
  high: 'error',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function subjectName(subjects: Subject[], subjectId?: string | null): string | null {
  if (!subjectId) return null;
  return subjects.find((subject) => subject._id === subjectId)?.name ?? null;
}

type ExamModalState = { mode: 'create' } | { mode: 'edit'; exam: Exam } | null;
type AssignmentModalState = { mode: 'create' } | { mode: 'edit'; assignment: Assignment } | null;

function ExamsTab({ subjects }: { subjects: Subject[] }) {
  const [sort, setSort] = useState<{ sortBy: ListExamsParams['sortBy']; order: 'asc' | 'desc' }>({
    sortBy: 'examDate',
    order: 'asc',
  });
  const { data: exams, isLoading, error, reload } = useResource(
    useCallback(() => listExams({ sortBy: sort.sortBy, order: sort.order }), [sort]),
    [sort]
  );
  const { showToast } = useToast();
  const [modal, setModal] = useState<ExamModalState>(null);

  const handleSubmit = async (input: ExamInput) => {
    if (modal?.mode === 'edit') {
      await updateExam(modal.exam._id, input);
      showToast('Exam updated.', 'success');
    } else {
      await createExam(input);
      showToast('Exam added.', 'success');
    }
    setModal(null);
    reload();
  };

  const handleDelete = async (exam: Exam) => {
    try {
      await deleteExam(exam._id);
      showToast(`${exam.title} deleted.`, 'success');
      reload();
    } catch {
      showToast('Could not delete this exam. Please try again.', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-48">
          <Select
            value={sort.sortBy}
            onChange={(event) => setSort((current) => ({ ...current, sortBy: event.target.value as ListExamsParams['sortBy'] }))}
          >
            <option value="examDate">Nearest deadline</option>
            <option value="priority">Priority</option>
            <option value="title">Title</option>
          </Select>
        </div>
        <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
          <Plus className="h-3.5 w-3.5" />
          Add Exam
        </Button>
      </div>

      {isLoading ? (
        <LoadingState label="Loading exams" />
      ) : error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : (exams ?? []).length === 0 ? (
        <EmptyState
          title="No upcoming exams."
          action={<Button size="sm" onClick={() => setModal({ mode: 'create' })}>Add Exam</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {(exams ?? []).map((exam) => (
            <Card key={exam._id} padded={false} className="flex flex-col gap-2.5 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-body font-medium">{exam.title}</span>
                <span className="truncate text-caption">
                  {subjectName(subjects, exam.subject) ?? 'No subject'} · {formatDateTime(exam.examDate)}
                </span>
              </div>
              <Badge tone={PRIORITY_TONE[exam.priority]}>{exam.priority}</Badge>
              <div className="flex shrink-0 items-center gap-1">
                <IconButton aria-label={`Edit ${exam.title}`} onClick={() => setModal({ mode: 'edit', exam })}>
                  <Pencil className="h-4 w-4" />
                </IconButton>
                <IconButton aria-label={`Delete ${exam.title}`} onClick={() => handleDelete(exam)}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </Card>
          ))}
        </ul>
      )}

      <Modal isOpen={modal !== null} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Edit Exam' : 'Add Exam'}>
        {modal && (
          <ExamForm
            subjects={subjects}
            initial={modal.mode === 'edit' ? modal.exam : undefined}
            onSubmit={handleSubmit}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function AssignmentsTab({ subjects }: { subjects: Subject[] }) {
  const [sort, setSort] = useState<{ sortBy: ListAssignmentsParams['sortBy']; order: 'asc' | 'desc' }>({
    sortBy: 'deadline',
    order: 'asc',
  });
  const { data: assignments, isLoading, error, reload } = useResource(
    useCallback(() => listAssignments({ sortBy: sort.sortBy, order: sort.order }), [sort]),
    [sort]
  );
  const { showToast } = useToast();
  const [modal, setModal] = useState<AssignmentModalState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleSubmit = async (input: AssignmentInput) => {
    if (modal?.mode === 'edit') {
      await updateAssignment(modal.assignment._id, input);
      showToast('Assignment updated.', 'success');
    } else {
      await createAssignment(input);
      showToast('Assignment added.', 'success');
    }
    setModal(null);
    reload();
  };

  const handleDelete = async (assignment: Assignment) => {
    try {
      await deleteAssignment(assignment._id);
      showToast(`${assignment.title} deleted.`, 'success');
      reload();
    } catch {
      showToast('Could not delete this assignment. Please try again.', 'error');
    }
  };

  const handleMarkComplete = async (assignment: Assignment) => {
    setBusyId(assignment._id);
    try {
      await updateAssignment(assignment._id, { status: 'completed' });
      showToast('Assignment marked complete.', 'success');
      reload();
    } catch {
      showToast('Could not update this assignment. Please try again.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-48">
          <Select
            value={sort.sortBy}
            onChange={(event) =>
              setSort((current) => ({ ...current, sortBy: event.target.value as ListAssignmentsParams['sortBy'] }))
            }
          >
            <option value="deadline">Nearest deadline</option>
            <option value="priority">Priority</option>
            <option value="status">Status</option>
            <option value="title">Title</option>
          </Select>
        </div>
        <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
          <Plus className="h-3.5 w-3.5" />
          Add Assignment
        </Button>
      </div>

      {isLoading ? (
        <LoadingState label="Loading assignments" />
      ) : error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : (assignments ?? []).length === 0 ? (
        <EmptyState
          title="No assignments yet."
          action={<Button size="sm" onClick={() => setModal({ mode: 'create' })}>Add Assignment</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {(assignments ?? []).map((assignment) => (
            <Card key={assignment._id} padded={false} className="flex flex-col gap-2.5 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-body font-medium">{assignment.title}</span>
                <span className="truncate text-caption">
                  {subjectName(subjects, assignment.subject) ?? 'No subject'} · Due {formatDateTime(assignment.deadline)}
                </span>
              </div>
              <Badge tone={PRIORITY_TONE[assignment.priority]}>{assignment.priority}</Badge>
              <Badge tone={assignment.status === 'completed' ? 'success' : assignment.status === 'overdue' ? 'error' : 'neutral'}>
                {assignment.status.replace('_', ' ')}
              </Badge>
              <div className="flex shrink-0 items-center gap-1">
                {assignment.status !== 'completed' && (
                  <IconButton
                    aria-label={`Mark ${assignment.title} complete`}
                    onClick={() => handleMarkComplete(assignment)}
                    disabled={busyId === assignment._id}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </IconButton>
                )}
                <IconButton aria-label={`Edit ${assignment.title}`} onClick={() => setModal({ mode: 'edit', assignment })}>
                  <Pencil className="h-4 w-4" />
                </IconButton>
                <IconButton aria-label={`Delete ${assignment.title}`} onClick={() => handleDelete(assignment)}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </Card>
          ))}
        </ul>
      )}

      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Edit Assignment' : 'Add Assignment'}
      >
        {modal && (
          <AssignmentForm
            subjects={subjects}
            initial={modal.mode === 'edit' ? modal.assignment : undefined}
            onSubmit={handleSubmit}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}

export function ExamsAssignmentsPage() {
  const { data: subjects } = useResource(listSubjects, []);

  const tabs: TabItem[] = [
    { id: 'exams', label: 'Exams', content: <ExamsTab subjects={subjects ?? []} /> },
    { id: 'assignments', label: 'Assignments', content: <AssignmentsTab subjects={subjects ?? []} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-page-heading">Exams & Assignments</h1>
        <p className="text-secondary">Keep every deadline in view and connected to your study plan.</p>
      </div>
      <Tabs tabs={tabs} defaultTabId="exams" />
    </div>
  );
}
