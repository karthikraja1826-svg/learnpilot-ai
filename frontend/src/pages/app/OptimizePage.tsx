import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, ListChecks, Target } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { useResource } from '../../hooks/useResource';
import { useToast } from '../../hooks/useToast';
import { getActiveSubject, listSubjects, setActiveSubject } from '../../services/subjects.service';
import { listTopics } from '../../services/topics.service';
import { cn } from '../../utils/cn';
import type { Subject } from '../../types/academic';

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  needs_revision: 'Needs revision',
};

export function OptimizePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const {
    data: subjects,
    isLoading: subjectsLoading,
    error: subjectsError,
    reload: reloadSubjects,
  } = useResource(listSubjects, []);
  const {
    data: topics,
    isLoading: topicsLoading,
    error: topicsError,
  } = useResource(useCallback(() => listTopics(), []), []);
  const {
    data: activeSubject,
    isLoading: activeLoading,
    error: activeError,
    reload: reloadActive,
  } = useResource(getActiveSubject, []);

  // The subject highlighted in the UI. Starts out mirroring whatever is
  // persisted as the active optimization subject once that finishes
  // loading, then tracks the user's own clicks from there.
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasSyncedFromServer = useRef(false);

  useEffect(() => {
    if (!activeLoading && !hasSyncedFromServer.current) {
      setSelectedSubjectId(activeSubject ? activeSubject._id : null);
      hasSyncedFromServer.current = true;
    }
  }, [activeLoading, activeSubject]);

  const selectedSubject: Subject | null =
    (subjects ?? []).find((subject) => subject._id === selectedSubjectId) ?? null;

  const isPersistedSelection = Boolean(activeSubject && activeSubject._id === selectedSubjectId);

  const selectedSubjectTopics = selectedSubject
    ? (topics ?? []).filter((topic) => topic.subject === selectedSubject._id)
    : [];

  const handleSelect = async (subject: Subject) => {
    if (isSaving) return;

    if (subject._id === activeSubject?._id) {
      setSelectedSubjectId(subject._id);
      return;
    }

    setSelectedSubjectId(subject._id);
    setIsSaving(true);
    try {
      await setActiveSubject(subject._id);
      showToast(`${subject.name} set as your optimization subject.`, 'success');
      reloadActive();
    } catch {
      showToast('Could not save your selection. Please try again.', 'error');
      setSelectedSubjectId(activeSubject ? activeSubject._id : null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = () => {
    if (!isPersistedSelection) return;
    navigate('/app/dashboard');
  };

  const isLoading = subjectsLoading || topicsLoading || activeLoading;
  const hasError = subjectsError || activeError || topicsError;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-page-heading">Choose a subject to optimize</h1>
        <p className="text-secondary">
          Pick the subject you want your daily roadmap, testing, and evaluation to focus on. You can change this
          any time.
        </p>
      </div>

      {isLoading ? (
        <LoadingState label="Loading subjects" />
      ) : hasError ? (
        <ErrorState
          description={subjectsError ?? activeError ?? topicsError ?? undefined}
          onRetry={() => {
            reloadSubjects();
            reloadActive();
          }}
        />
      ) : (subjects ?? []).length === 0 ? (
        <EmptyState
          icon={<Target className="h-6 w-6" />}
          title="No subjects available yet."
          description="Add a subject first, then come back here to choose the one you want to optimize."
          action={<Button onClick={() => navigate('/app/subjects')}>Go to Subjects</Button>}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <h2 className="text-section-heading">Your subjects</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(subjects ?? []).map((subject) => {
                const isSelected = selectedSubjectId === subject._id;
                const isCurrentlyActive = activeSubject?._id === subject._id;
                return (
                  <button
                    key={subject._id}
                    type="button"
                    onClick={() => handleSelect(subject)}
                    disabled={isSaving}
                    aria-pressed={isSelected}
                    className={cn(
                      'surface-card flex items-center gap-3 p-4 text-left transition-colors duration-250',
                      'disabled:cursor-not-allowed disabled:opacity-70',
                      isSelected ? 'border-accent ring-1 ring-accent/40' : 'hover:bg-accent-soft'
                    )}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: subject.color || '#ca704b' }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-body font-medium">{subject.name}</span>
                    {isCurrentlyActive && (
                      <Badge tone="accent" className="shrink-0">
                        Current
                      </Badge>
                    )}
                    {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>

          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-label">Selected subject</span>
              {isSaving && <span className="text-caption text-text-secondary">Saving…</span>}
            </div>

            {!selectedSubject ? (
              <EmptyState
                title="No subject selected yet."
                description="Choose a subject above to see its details and continue."
              />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{ backgroundColor: selectedSubject.color || '#ca704b' }}
                    aria-hidden="true"
                  />
                  <h3 className="text-section-heading">{selectedSubject.name}</h3>
                </div>

                {selectedSubject.description && (
                  <p className="text-secondary">{selectedSubject.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">Difficulty {selectedSubject.difficulty}/5</Badge>
                  <Badge tone="neutral">Importance {selectedSubject.importance}/5</Badge>
                  <Badge tone="accent">
                    {selectedSubjectTopics.length} {selectedSubjectTopics.length === 1 ? 'topic' : 'topics'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ProgressBar
                    value={selectedSubject.currentPerformance}
                    label={`Current performance: ${Math.round(selectedSubject.currentPerformance)}%`}
                  />
                  <ProgressBar
                    value={selectedSubject.targetPerformance}
                    label={`Target mastery: ${Math.round(selectedSubject.targetPerformance)}%`}
                  />
                </div>

                {selectedSubjectTopics.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="flex items-center gap-1.5 text-label">
                      <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                      Topics
                    </span>
                    <ul className="flex flex-col gap-2">
                      {selectedSubjectTopics.map((topic) => (
                        <li
                          key={topic._id}
                          className="flex items-center gap-3 rounded-lg border border-border px-3.5 py-2.5"
                        >
                          <span className="min-w-0 flex-1 truncate text-body">{topic.name}</span>
                          <span className="hidden shrink-0 text-caption sm:inline">
                            {Math.round(topic.currentMastery)}% mastery
                          </span>
                          <Badge tone="neutral">{STATUS_LABEL[topic.status] ?? topic.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleContinue} disabled={!isPersistedSelection || isSaving}>
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
