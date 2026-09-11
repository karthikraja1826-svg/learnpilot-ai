import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LinkButton } from '../../components/ui/LinkButton';
import { SessionSetupCard } from '../../components/pomodoro/SessionSetupCard';
import { ActiveSessionCard } from '../../components/pomodoro/ActiveSessionCard';
import { SessionCompleteCard } from '../../components/pomodoro/SessionCompleteCard';
import { SessionHistoryList } from '../../components/pomodoro/SessionHistoryList';
import { useResource } from '../../hooks/useResource';
import { useToast } from '../../hooks/useToast';
import { ApiRequestError } from '../../services/api';
import { getActiveSession } from '../../services/dashboard.service';
import { listSubjects } from '../../services/subjects.service';
import { listTopics } from '../../services/topics.service';
import { getAvailability } from '../../services/availability.service';
import {
  cancelSession,
  completeCycle,
  completeSession,
  createManualSession,
  listSessionHistory,
  pauseSession,
  resumeSession,
  startSession,
  type CreateManualSessionInput,
} from '../../services/studySessions.service';
import type { StudySession } from '../../types/dashboard';

type ViewMode = 'setup' | 'active' | 'complete';
type SessionPhase = 'focus' | 'break';

const LONG_BREAK_INTERVAL = 4;

async function loadCurrentSession(): Promise<StudySession | null> {
  const active = await getActiveSession();
  if (active) return active;

  const { sessions } = await listSessionHistory({ status: 'paused', limit: 1 });
  return sessions[0] ?? null;
}

// Time left in the focus cycle currently in progress.
function computeFocusRemainingSeconds(session: StudySession): number {
  const cycleSeconds = Math.max(1, session.focusDurationMinutes) * 60;
  const elapsedSeconds = session.actualDurationMinutes * 60;
  const creditedSeconds = session.cyclesCompleted * cycleSeconds;
  const elapsedInCycle = Math.max(0, elapsedSeconds - creditedSeconds);
  return Math.max(0, cycleSeconds - elapsedInCycle);
}

function isLongBreakAfter(cyclesCompleted: number): boolean {
  return cyclesCompleted > 0 && cyclesCompleted % LONG_BREAK_INTERVAL === 0;
}

function getBreakSeconds(session: StudySession): number {
  const minutes = isLongBreakAfter(session.cyclesCompleted)
    ? session.longBreakDurationMinutes
    : session.shortBreakDurationMinutes;
  return minutes * 60;
}

export function PomodoroPage() {
  const { showToast } = useToast();

  const sessionRes = useResource(loadCurrentSession, []);
  const subjectsRes = useResource(listSubjects, []);
  const topicsRes = useResource(useCallback(() => listTopics(), []), []);
  const availabilityRes = useResource(getAvailability, []);
  const historyRes = useResource(useCallback(() => listSessionHistory({ limit: 5 }), []), []);

  const [session, setSession] = useState<StudySession | null>(null);
  const [mode, setMode] = useState<ViewMode>('setup');
  const [phase, setPhase] = useState<SessionPhase>('focus');
  const [completedInfo, setCompletedInfo] = useState<{ session: StudySession; wasStoppedEarly: boolean } | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const transitionGuardRef = useRef(false);

  const applyFocusSessionUpdate = useCallback((updated: StudySession) => {
    setSession(updated);
    setPhase('focus');
    setRemainingSeconds(computeFocusRemainingSeconds(updated));
  }, []);

  // Recovery always resumes into the focus phase; safe whether the session
  // was paused mid-focus or paused for a break.
  useEffect(() => {
    if (sessionRes.isLoading) return;
    const loaded = sessionRes.data;
    if (loaded) {
      setSession(loaded);
      setPhase('focus');
      setRemainingSeconds(computeFocusRemainingSeconds(loaded));
      setMode('active');
    } else {
      setMode('setup');
    }
  }, [sessionRes.isLoading, sessionRes.data]);

  const subjectNameById = useMemo(() => {
    const map = new Map<string, string>();
    (subjectsRes.data ?? []).forEach((subject) => map.set(subject._id, subject.name));
    return map;
  }, [subjectsRes.data]);

  const topicNameById = useMemo(() => {
    const map = new Map<string, string>();
    (topicsRes.data ?? []).forEach((topic) => map.set(topic._id, topic.name));
    return map;
  }, [topicsRes.data]);

  const totalSeconds = session
    ? phase === 'break'
      ? getBreakSeconds(session)
      : session.focusDurationMinutes * 60
    : 0;

  // Countdown tick; the break countdown is frontend-only state.
  useEffect(() => {
    if (mode !== 'active' || !session) return;
    if (phase === 'focus' && session.status !== 'active') return;
    if (phase === 'break' && session.status !== 'paused') return;

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [mode, phase, session?.status, session?._id]);

  // focus -> break -> focus -> ... -> complete, guarded against duplicate calls.
  useEffect(() => {
    if (mode !== 'active' || !session || remainingSeconds > 0) return;
    if (transitionGuardRef.current) return;
    transitionGuardRef.current = true;

    if (phase === 'focus') {
      (async () => {
        try {
          const cycled = await completeCycle(session._id);
          if (cycled.cyclesCompleted >= cycled.cyclesPlanned) {
            const finished = await completeSession(cycled._id);
            setSession(finished);
            setCompletedInfo({ session: finished, wasStoppedEarly: false });
            setMode('complete');
            historyRes.reload();
          } else {
            const paused = await pauseSession(cycled._id);
            setSession(paused);
            setPhase('break');
            setRemainingSeconds(getBreakSeconds(paused));
          }
        } catch {
          showToast('Could not advance your focus session automatically. Please check your connection.', 'error');
        } finally {
          transitionGuardRef.current = false;
        }
      })();
    } else {
      (async () => {
        try {
          const resumed = await resumeSession(session._id);
          setSession(resumed);
          setPhase('focus');
          setRemainingSeconds(resumed.focusDurationMinutes * 60);
          showToast('Break\u2019s over \u2014 back to focus!', 'success');
        } catch {
          showToast('Could not resume your focus session. Please check your connection.', 'error');
        } finally {
          transitionGuardRef.current = false;
        }
      })();
    }
  }, [remainingSeconds, mode, phase, session, historyRes, showToast]);

  const handleStart = async (input: CreateManualSessionInput) => {
    setIsStarting(true);
    try {
      const created = await createManualSession(input);
      const started = await startSession(created._id);
      applyFocusSessionUpdate(started);
      setMode('active');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        showToast(err.message, 'error');
      } else {
        showToast('Could not start a focus session. Please try again.', 'error');
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handlePause = async () => {
    if (!session) return;
    setIsTransitioning(true);
    try {
      const updated = await pauseSession(session._id);
      applyFocusSessionUpdate(updated);
    } catch {
      showToast('Could not pause your session. Please try again.', 'error');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleResume = async () => {
    if (!session) return;
    setIsTransitioning(true);
    try {
      const updated = await resumeSession(session._id);
      applyFocusSessionUpdate(updated);
    } catch {
      showToast('Could not resume your session. Please try again.', 'error');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleStop = async () => {
    if (!session) return;
    setIsTransitioning(true);
    try {
      const updated = await cancelSession(session._id);
      setSession(updated);
      setCompletedInfo({ session: updated, wasStoppedEarly: true });
      setMode('complete');
      historyRes.reload();
    } catch {
      showToast('Could not stop your session. Please try again.', 'error');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleStartAnother = () => {
    setSession(null);
    setCompletedInfo(null);
    setPhase('focus');
    setMode('setup');
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-page-heading">Pomodoro</h1>
        <p className="text-secondary">Focused study sessions with built-in breaks.</p>
      </div>

      {sessionRes.isLoading ? (
        <Card>
          <LoadingState label="Loading focus session" className="py-10" />
        </Card>
      ) : sessionRes.error ? (
        <Card>
          <ErrorState description={sessionRes.error} onRetry={sessionRes.reload} className="border-none px-0 py-10" />
        </Card>
      ) : mode === 'setup' ? (
        <SessionSetupCard
          subjects={subjectsRes.data ?? []}
          topics={topicsRes.data ?? []}
          defaultFocusMinutes={availabilityRes.data?.preferredSessionDuration ?? 25}
          defaultBreakMinutes={availabilityRes.data?.preferredBreakDuration ?? 5}
          onStart={handleStart}
          isStarting={isStarting}
        />
      ) : mode === 'active' && session ? (
        <ActiveSessionCard
          session={session}
          phase={phase}
          subjectName={(session.subject && subjectNameById.get(session.subject)) || undefined}
          topicName={(session.topic && topicNameById.get(session.topic)) || undefined}
          remainingSeconds={remainingSeconds}
          totalSeconds={totalSeconds}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          isTransitioning={isTransitioning}
        />
      ) : mode === 'complete' && completedInfo ? (
        <SessionCompleteCard
          session={completedInfo.session}
          subjectName={
            (completedInfo.session.subject && subjectNameById.get(completedInfo.session.subject)) || undefined
          }
          wasStoppedEarly={completedInfo.wasStoppedEarly}
          onStartAnother={handleStartAnother}
        />
      ) : null}

      <SessionHistoryList
        sessions={historyRes.data?.sessions ?? []}
        subjectNameById={subjectNameById}
        topicNameById={topicNameById}
        isLoading={historyRes.isLoading}
        error={historyRes.error}
        onRetry={historyRes.reload}
        compact
      />

      <div className="flex flex-wrap items-center gap-3">
        <LinkButton to="/app/dashboard" variant="ghost" size="sm">
          Back to Dashboard
        </LinkButton>
        <LinkButton to="/app/study-plan" variant="ghost" size="sm">
          View Study Plan
        </LinkButton>
        <LinkButton to="/app/analytics" variant="ghost" size="sm">
          View Analytics
        </LinkButton>
      </div>
    </div>
  );
}
