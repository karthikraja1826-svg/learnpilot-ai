import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { useResource } from '../../hooks/useResource';
import { useToast } from '../../hooks/useToast';
import { ApiRequestError } from '../../services/api';
import { listTopics } from '../../services/topics.service';
import { listTasks } from '../../services/tasks.service';
import { listAssignments } from '../../services/assignments.service';
import { getAvailability, createAvailability, updateAvailability } from '../../services/availability.service';
import {
  entryToManualInput,
  generateDailyPlan,
  generateRoadmap,
  generateWeeklyPlan,
  getCurrentWeekPlan,
  getTodayPlan,
  getTodayRoadmap,
  regeneratePlan,
  updatePlanEntries,
} from '../../services/studyPlans.service';
import { getNextDayPlan } from '../../services/nextDayOptimization.service';
import { startFocusSessionForEntry } from '../../services/studySessions.service';
import { AvailabilityOverview } from '../../components/availability/AvailabilityOverview';
import { AvailabilityForm } from '../../components/availability/AvailabilityForm';
import { DailyPlanView } from '../../components/studyplan/DailyPlanView';
import { WeeklyPlanView } from '../../components/studyplan/WeeklyPlanView';
import { TodaysRoadmapView } from '../../components/studyplan/TodaysRoadmapView';
import { NextDayRoadmapView } from '../../components/studyplan/NextDayRoadmapView';
import { GenerationOverlay } from '../../components/studyplan/GenerationOverlay';
import { PlanEntryEditModal } from '../../components/studyplan/PlanEntryEditModal';
import { PlanEntryDetailModal } from '../../components/studyplan/PlanEntryDetailModal';
import type { StudyAvailabilityInput } from '../../services/availability.service';
import type { PlanEntryStatus, StudyPlan, StudyPlanEntry } from '../../types/academic';

type EditModalState = { plan: StudyPlan; entry: StudyPlanEntry } | null;
type DetailModalState = { entry: StudyPlanEntry } | null;
type RegenerateModalState = { plan: StudyPlan } | null;
type GenerateKind = 'daily' | 'weekly' | 'roadmap';

export function StudyPlanPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const availabilityRes = useResource(getAvailability, []);
  const topicsRes = useResource(useCallback(() => listTopics(), []), []);
  const tasksRes = useResource(useCallback(() => listTasks(), []), []);
  const assignmentsRes = useResource(useCallback(() => listAssignments(), []), []);
  const todayRes = useResource(getTodayPlan, []);
  const weekRes = useResource(getCurrentWeekPlan, []);
  const roadmapRes = useResource(getTodayRoadmap, []);
  const nextDayRes = useResource(getNextDayPlan, []);

  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<EditModalState>(null);
  const [detailModal, setDetailModal] = useState<DetailModalState>(null);
  const [regenerateModal, setRegenerateModal] = useState<RegenerateModalState>(null);

  const hasWorkItems = (topicsRes.data?.length ?? 0) > 0 || (tasksRes.data?.length ?? 0) > 0 || (assignmentsRes.data?.length ?? 0) > 0;
  const hasAvailability = availabilityRes.data !== null;
  const canGenerate = hasAvailability && hasWorkItems;
  const blockedReason = !hasAvailability
    ? 'Set your available study time so LearnPilot AI can plan around your schedule.'
    : !hasWorkItems
      ? "Add a few subjects, deadlines, or tasks before generating your plan."
      : null;

  // Roadmap generation only makes sense once a subject is selected (Part 1),
  // and only needs *that* subject to have schedulable work, not the whole
  // academic workload.
  const roadmapSubjectId = roadmapRes.data?.subject?._id ?? null;
  const roadmapHasWorkItems =
    roadmapSubjectId !== null &&
    ((topicsRes.data ?? []).some((topic) => topic.subject === roadmapSubjectId) ||
      (tasksRes.data ?? []).some((task) => task.subject === roadmapSubjectId) ||
      (assignmentsRes.data ?? []).some((assignment) => assignment.subject === roadmapSubjectId));
  const canGenerateRoadmap = hasAvailability && roadmapHasWorkItems;
  const roadmapBlockedReason = !hasAvailability
    ? 'Set your available study time so LearnPilot AI can plan around your schedule.'
    : !roadmapHasWorkItems
      ? "Add a few topics, deadlines, or tasks for this subject before generating today's roadmap."
      : null;

  const handleAvailabilitySubmit = async (input: StudyAvailabilityInput) => {
    if (availabilityRes.data) {
      await updateAvailability(input);
      showToast('Availability updated.', 'success');
    } else {
      await createAvailability(input);
      showToast('Availability saved.', 'success');
    }
    setIsAvailabilityModalOpen(false);
    availabilityRes.reload();
  };

  const handleGenerate = async (planType: GenerateKind) => {
    setIsGenerating(true);
    try {
      if (planType === 'daily') {
        await generateDailyPlan();
        todayRes.reload();
      } else if (planType === 'weekly') {
        await generateWeeklyPlan();
        weekRes.reload();
      } else {
        await generateRoadmap();
        roadmapRes.reload();
      }
      showToast(planType === 'roadmap' ? "Today's roadmap is ready." : 'Your study plan is ready.', 'success');
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 422) {
        showToast(err.message, 'error');
      } else {
        showToast('Could not generate a plan right now. Please try again.', 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // A roadmap is still a `daily` plan under the hood (see StudyPlan.optimizationSubject),
  // so it's distinguished from the general Today plan by that field rather than planType.
  const reloadForPlan = (plan: StudyPlan) => {
    if (plan.optimizationSubject) {
      roadmapRes.reload();
    } else if (plan.planType === 'daily') {
      todayRes.reload();
    } else {
      weekRes.reload();
    }
  };

  const handleRegenerate = async () => {
    if (!regenerateModal) return;
    const { plan } = regenerateModal;
    setRegenerateModal(null);
    setIsGenerating(true);
    try {
      await regeneratePlan(plan._id);
      reloadForPlan(plan);
      showToast(
        plan.optimizationSubject ? 'Your roadmap has been regenerated.' : 'Your study plan has been regenerated.',
        'success'
      );
    } catch {
      showToast('Could not regenerate your plan. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartFocus = async (plan: StudyPlan, entry: StudyPlanEntry) => {
    setBusyEntryId(entry._id);
    try {
      await startFocusSessionForEntry(plan._id, entry);
      showToast('Focus session started.', 'success');
      reloadForPlan(plan);
      navigate('/app/pomodoro');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        showToast(err.message, 'error');
      } else {
        showToast('Could not start a focus session. Please try again.', 'error');
      }
    } finally {
      setBusyEntryId(null);
    }
  };

  const handleMarkComplete = async (plan: StudyPlan, entry: StudyPlanEntry) => {
    setBusyEntryId(entry._id);
    try {
      const entries = plan.entries.map((item) =>
        entryToManualInput(item._id === entry._id ? { ...item, status: 'completed' as PlanEntryStatus } : item)
      );
      await updatePlanEntries(plan._id, entries);
      showToast('Session marked complete.', 'success');
      reloadForPlan(plan);
    } catch {
      showToast('Could not update this session. Please try again.', 'error');
    } finally {
      setBusyEntryId(null);
    }
  };

  const handleEditSubmit = async (
    plan: StudyPlan,
    entry: StudyPlanEntry,
    changes: { startTime: string; endTime: string; durationMinutes: number; status: PlanEntryStatus; reason: string }
  ) => {
    const entries = plan.entries.map((item) => entryToManualInput(item._id === entry._id ? { ...item, ...changes } : item));
    await updatePlanEntries(plan._id, entries);
    showToast('Session updated.', 'success');
    setEditModal(null);
    reloadForPlan(plan);
  };

  const tabs: TabItem[] = [
    {
      id: 'roadmap',
      label: "Today's Roadmap",
      content: (
        <TodaysRoadmapView
          subject={roadmapRes.data?.subject ?? null}
          plan={roadmapRes.data?.plan ?? null}
          isLoading={roadmapRes.isLoading}
          error={roadmapRes.error}
          onRetry={roadmapRes.reload}
          canGenerate={canGenerateRoadmap}
          blockedReason={roadmapBlockedReason}
          onGenerate={() => handleGenerate('roadmap')}
          onStartFocus={(entry) => roadmapRes.data?.plan && handleStartFocus(roadmapRes.data.plan, entry)}
          onMarkComplete={(entry) => roadmapRes.data?.plan && handleMarkComplete(roadmapRes.data.plan, entry)}
          onViewDetails={(entry) => setDetailModal({ entry })}
          onEdit={(entry) => roadmapRes.data?.plan && setEditModal({ plan: roadmapRes.data.plan, entry })}
          busyEntryId={busyEntryId}
          onRegenerate={() => roadmapRes.data?.plan && setRegenerateModal({ plan: roadmapRes.data.plan })}
        />
      ),
    },
    {
      id: 'next-day',
      label: 'Next Day',
      content: (
        <NextDayRoadmapView
          subject={nextDayRes.data?.subject ?? null}
          plan={nextDayRes.data?.plan ?? null}
          isLoading={nextDayRes.isLoading}
          error={nextDayRes.error}
          onRetry={nextDayRes.reload}
          onViewDetails={(entry) => setDetailModal({ entry })}
        />
      ),
    },
    {
      id: 'today',
      label: 'Today (All Subjects)',
      content: (
        <DailyPlanView
          plan={todayRes.data}
          isLoading={todayRes.isLoading}
          error={todayRes.error}
          onRetry={todayRes.reload}
          canGenerate={canGenerate}
          blockedReason={blockedReason}
          onGenerate={() => handleGenerate('daily')}
          onStartFocus={(entry) => todayRes.data && handleStartFocus(todayRes.data, entry)}
          onMarkComplete={(entry) => todayRes.data && handleMarkComplete(todayRes.data, entry)}
          onViewDetails={(entry) => setDetailModal({ entry })}
          onEdit={(entry) => todayRes.data && setEditModal({ plan: todayRes.data, entry })}
          busyEntryId={busyEntryId}
          onRegenerate={() => todayRes.data && setRegenerateModal({ plan: todayRes.data })}
        />
      ),
    },
    {
      id: 'week',
      label: 'This Week',
      content: (
        <WeeklyPlanView
          plan={weekRes.data}
          isLoading={weekRes.isLoading}
          error={weekRes.error}
          onRetry={weekRes.reload}
          canGenerate={canGenerate}
          blockedReason={blockedReason}
          onGenerate={() => handleGenerate('weekly')}
          onStartFocus={(entry) => weekRes.data && handleStartFocus(weekRes.data, entry)}
          onMarkComplete={(entry) => weekRes.data && handleMarkComplete(weekRes.data, entry)}
          onViewDetails={(entry) => setDetailModal({ entry })}
          onEdit={(entry) => weekRes.data && setEditModal({ plan: weekRes.data, entry })}
          busyEntryId={busyEntryId}
          onRegenerate={() => weekRes.data && setRegenerateModal({ plan: weekRes.data })}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-page-heading">Your Study Plan</h1>
        <p className="text-secondary">Turn your priorities into a realistic study schedule.</p>
      </div>

      <AvailabilityOverview availability={availabilityRes.data} onEdit={() => setIsAvailabilityModalOpen(true)} />

      <Tabs tabs={tabs} defaultTabId="roadmap" />

      <GenerationOverlay isOpen={isGenerating} />

      <Modal
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
        title={availabilityRes.data ? 'Edit Availability' : 'Configure Availability'}
      >
        <AvailabilityForm
          initial={availabilityRes.data}
          onSubmit={handleAvailabilitySubmit}
          onCancel={() => setIsAvailabilityModalOpen(false)}
        />
      </Modal>

      <Modal isOpen={editModal !== null} onClose={() => setEditModal(null)} title="Edit Session">
        {editModal && (
          <PlanEntryEditModal
            entry={editModal.entry}
            onSubmit={(changes) => handleEditSubmit(editModal.plan, editModal.entry, changes)}
            onCancel={() => setEditModal(null)}
          />
        )}
      </Modal>

      <Modal isOpen={detailModal !== null} onClose={() => setDetailModal(null)} title="Session Details">
        {detailModal && <PlanEntryDetailModal entry={detailModal.entry} />}
      </Modal>

      <Modal isOpen={regenerateModal !== null} onClose={() => setRegenerateModal(null)} title="Regenerate your study plan?">
        {regenerateModal && (
          <div className="flex flex-col gap-4">
            <p className="text-secondary">
              Your current plan will only be replaced after a new plan is successfully generated.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRegenerateModal(null)}>
                Cancel
              </Button>
              <Button onClick={handleRegenerate}>Regenerate</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
