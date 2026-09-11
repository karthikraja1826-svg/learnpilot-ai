import { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { SubjectCard } from '../../components/academic/SubjectCard';
import { SubjectForm } from '../../components/academic/SubjectForm';
import { TopicForm } from '../../components/academic/TopicForm';
import { TopicRow } from '../../components/academic/TopicRow';
import { useResource } from '../../hooks/useResource';
import { useToast } from '../../hooks/useToast';
import { ApiRequestError } from '../../services/api';
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
  type SubjectInput,
} from '../../services/subjects.service';
import { createTopic, deleteTopic, listTopics, updateTopic, type TopicInput } from '../../services/topics.service';
import type { Subject, Topic } from '../../types/academic';

type SubjectModalState = { mode: 'create' } | { mode: 'edit'; subject: Subject } | null;
type TopicModalState = { mode: 'create'; subjectId: string } | { mode: 'edit'; topic: Topic } | null;

export function SubjectsPage() {
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
    reload: reloadTopics,
  } = useResource(useCallback(() => listTopics(), []), []);
  const { showToast } = useToast();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [subjectModal, setSubjectModal] = useState<SubjectModalState>(null);
  const [topicModal, setTopicModal] = useState<TopicModalState>(null);

  const topicCountFor = (subjectId: string) => (topics ?? []).filter((topic) => topic.subject === subjectId).length;

  const handleSubjectSubmit = async (input: SubjectInput) => {
    if (subjectModal?.mode === 'edit') {
      await updateSubject(subjectModal.subject._id, input);
      showToast('Subject updated.', 'success');
    } else {
      await createSubject(input);
      showToast('Subject added.', 'success');
    }
    setSubjectModal(null);
    reloadSubjects();
  };

  const handleDeleteSubject = async (subject: Subject) => {
    try {
      await deleteSubject(subject._id);
      showToast(`${subject.name} deleted.`, 'success');
      if (selectedSubjectId === subject._id) setSelectedSubjectId(null);
      reloadSubjects();
      reloadTopics();
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        showToast(err.message, 'error');
      } else {
        showToast('Could not delete this subject. Please try again.', 'error');
      }
    }
  };

  const handleTopicSubmit = async (input: TopicInput) => {
    if (topicModal?.mode === 'edit') {
      await updateTopic(topicModal.topic._id, input);
      showToast('Topic updated.', 'success');
    } else {
      await createTopic(input);
      showToast('Topic added.', 'success');
    }
    setTopicModal(null);
    reloadTopics();
    reloadSubjects();
  };

  const handleDeleteTopic = async (topic: Topic) => {
    try {
      await deleteTopic(topic._id);
      showToast(`${topic.name} deleted.`, 'success');
      reloadTopics();
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        showToast(err.message, 'error');
      } else {
        showToast('Could not delete this topic. Please try again.', 'error');
      }
    }
  };

  const selectedSubject = (subjects ?? []).find((subject) => subject._id === selectedSubjectId) ?? null;
  const selectedSubjectTopics = selectedSubject
    ? (topics ?? []).filter((topic) => topic.subject === selectedSubject._id)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-page-heading">Subjects & Topics</h1>
          <p className="text-secondary">
            Organize what you're learning and keep every topic connected to your study plan.
          </p>
        </div>
        <Button onClick={() => setSubjectModal({ mode: 'create' })}>
          <Plus className="h-4 w-4" />
          Add Subject
        </Button>
      </div>

      {subjectsLoading || topicsLoading ? (
        <LoadingState label="Loading subjects" />
      ) : subjectsError ? (
        <ErrorState description={subjectsError} onRetry={reloadSubjects} />
      ) : (subjects ?? []).length === 0 ? (
        <EmptyState
          title="Start by adding your first subject."
          description="Subjects keep your topics, tasks, and study plan organized."
          action={<Button onClick={() => setSubjectModal({ mode: 'create' })}>Add Subject</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(subjects ?? []).map((subject) => (
            <SubjectCard
              key={subject._id}
              subject={subject}
              topicCount={topicCountFor(subject._id)}
              isSelected={selectedSubjectId === subject._id}
              onViewTopics={() => setSelectedSubjectId(subject._id)}
              onEdit={() => setSubjectModal({ mode: 'edit', subject })}
              onDelete={() => handleDeleteSubject(subject)}
            />
          ))}
        </div>
      )}

      {selectedSubject && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-section-heading">Topics in {selectedSubject.name}</h2>
            <Button size="sm" onClick={() => setTopicModal({ mode: 'create', subjectId: selectedSubject._id })}>
              <Plus className="h-3.5 w-3.5" />
              Add Topic
            </Button>
          </div>

          {topicsError ? (
            <ErrorState description={topicsError} onRetry={reloadTopics} />
          ) : selectedSubjectTopics.length === 0 ? (
            <EmptyState
              title="No topics added yet."
              action={
                <Button size="sm" onClick={() => setTopicModal({ mode: 'create', subjectId: selectedSubject._id })}>
                  Add Topic
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {selectedSubjectTopics.map((topic) => (
                <TopicRow
                  key={topic._id}
                  topic={topic}
                  onEdit={() => setTopicModal({ mode: 'edit', topic })}
                  onDelete={() => handleDeleteTopic(topic)}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal
        isOpen={subjectModal !== null}
        onClose={() => setSubjectModal(null)}
        title={subjectModal?.mode === 'edit' ? 'Edit Subject' : 'Add Subject'}
      >
        {subjectModal && (
          <SubjectForm
            initial={subjectModal.mode === 'edit' ? subjectModal.subject : undefined}
            onSubmit={handleSubjectSubmit}
            onCancel={() => setSubjectModal(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={topicModal !== null}
        onClose={() => setTopicModal(null)}
        title={topicModal?.mode === 'edit' ? 'Edit Topic' : 'Add Topic'}
      >
        {topicModal && (
          <TopicForm
            subjectId={topicModal.mode === 'edit' ? topicModal.topic.subject : topicModal.subjectId}
            initial={topicModal.mode === 'edit' ? topicModal.topic : undefined}
            onSubmit={handleTopicSubmit}
            onCancel={() => setTopicModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}
