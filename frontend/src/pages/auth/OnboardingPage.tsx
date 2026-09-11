import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StepIndicator } from '../../components/onboarding/StepIndicator';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getAuthErrorMessage } from '../../utils/firebaseErrors';
import { DASHBOARD_PATH } from '../../utils/authRedirect';

const STEP_LABELS = ['About You', 'Academics', 'Study Goals', 'Preferences'];
const STUDY_PERIODS = ['Morning', 'Afternoon', 'Evening', 'Night'];
const DAILY_TARGET_OPTIONS = ['1 hour', '2 hours', '3 hours', '4 hours', '5+ hours'];
const SESSION_DURATION_OPTIONS = ['25 minutes', '30 minutes', '45 minutes', '60 minutes', '90 minutes'];
const BREAK_DURATION_OPTIONS = ['5 minutes', '10 minutes', '15 minutes', '20 minutes'];

interface OnboardingData {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  bio: string;
  institution: string;
  degreeCourse: string;
  department: string;
  yearSemester: string;
  studentId: string;
  academicGoals: string;
  shortTermGoals: string;
  longTermGoals: string;
  improvementAreas: string;
  learningInterests: string;
  dailyStudyTarget: string;
  preferredStudyPeriods: string[];
  preferredSessionDuration: string;
  breakDuration: string;
  timezone: string;
}

export function OnboardingPage() {
  const { firebaseUser, profile, updateProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const detectedTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    fullName: profile?.name ?? firebaseUser?.displayName ?? '',
    phone: '',
    dateOfBirth: '',
    bio: '',
    institution: '',
    degreeCourse: '',
    department: '',
    yearSemester: '',
    studentId: '',
    academicGoals: '',
    shortTermGoals: '',
    longTermGoals: '',
    improvementAreas: '',
    learningInterests: '',
    dailyStudyTarget: DAILY_TARGET_OPTIONS[1],
    preferredStudyPeriods: [],
    preferredSessionDuration: SESSION_DURATION_OPTIONS[2],
    breakDuration: BREAK_DURATION_OPTIONS[1],
    timezone: detectedTimezone,
  });
  const [fullNameError, setFullNameError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function togglePeriod(period: string) {
    setData((current) => ({
      ...current,
      preferredStudyPeriods: current.preferredStudyPeriods.includes(period)
        ? current.preferredStudyPeriods.filter((item) => item !== period)
        : [...current.preferredStudyPeriods, period],
    }));
  }

  function validateStep(activeStep: number): boolean {
    if (activeStep === 1) {
      if (!data.fullName.trim()) {
        setFullNameError('Full name is required.');
        return false;
      }
      setFullNameError(undefined);
    }
    return true;
  }

  function handleNext() {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, STEP_LABELS.length));
  }

  function handleBack() {
    setStep((current) => Math.max(current - 1, 1));
  }

  async function handleFinish(event: FormEvent) {
    event.preventDefault();
    if (!validateStep(1)) {
      setStep(1);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await updateProfile({
        name: data.fullName.trim(),
        phone: data.phone.trim() || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
        bio: data.bio.trim() || undefined,
        institution: data.institution.trim() || undefined,
        degreeCourse: data.degreeCourse.trim() || undefined,
        department: data.department.trim() || undefined,
        yearSemester: data.yearSemester.trim() || undefined,
        studentId: data.studentId.trim() || undefined,
        academicGoals: data.academicGoals.trim() || undefined,
        shortTermGoals: data.shortTermGoals.trim() || undefined,
        longTermGoals: data.longTermGoals.trim() || undefined,
        improvementAreas: data.improvementAreas.trim() || undefined,
        learningInterests: data.learningInterests.trim() || undefined,
        dailyStudyTarget: data.dailyStudyTarget,
        preferredStudyPeriods: data.preferredStudyPeriods.length > 0 ? data.preferredStudyPeriods : undefined,
        preferredSessionDuration: data.preferredSessionDuration,
        breakDuration: data.breakDuration,
        timezone: data.timezone,
        onboardingCompleted: true,
      });
      showToast('Your study profile is ready.', 'success');
      navigate(DASHBOARD_PATH, { replace: true });
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLastStep = step === STEP_LABELS.length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-page-heading">Let&apos;s set up your study profile</h1>
        <p className="text-secondary">A few details help LearnPilot AI build a plan around your schedule.</p>
      </div>

      <StepIndicator steps={STEP_LABELS} currentStep={step} />

      <Card padded={false} className="p-6 sm:p-8">
        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={isLastStep ? handleFinish : (event) => event.preventDefault()}
        >
          {formError && (
            <p role="alert" className="rounded-xl border border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-error">
              {formError}
            </p>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-5">
              <Input
                label="Full name"
                autoComplete="name"
                value={data.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
                error={fullNameError}
              />
              <Input
                label="Phone (optional)"
                type="tel"
                autoComplete="tel"
                value={data.phone}
                onChange={(event) => updateField('phone', event.target.value)}
              />
              <Input
                label="Date of birth (optional)"
                type="date"
                value={data.dateOfBirth}
                onChange={(event) => updateField('dateOfBirth', event.target.value)}
              />
              <Textarea
                label="Bio (optional)"
                placeholder="A short line about yourself"
                value={data.bio}
                onChange={(event) => updateField('bio', event.target.value)}
              />
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <Input
                label="Institution"
                value={data.institution}
                onChange={(event) => updateField('institution', event.target.value)}
              />
              <Input
                label="Degree / course"
                value={data.degreeCourse}
                onChange={(event) => updateField('degreeCourse', event.target.value)}
              />
              <Input
                label="Department / specialization"
                value={data.department}
                onChange={(event) => updateField('department', event.target.value)}
              />
              <Input
                label="Year / semester"
                value={data.yearSemester}
                onChange={(event) => updateField('yearSemester', event.target.value)}
              />
              <Input
                label="Student ID (optional)"
                value={data.studentId}
                onChange={(event) => updateField('studentId', event.target.value)}
              />
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              <Textarea
                label="Academic goals"
                value={data.academicGoals}
                onChange={(event) => updateField('academicGoals', event.target.value)}
              />
              <Textarea
                label="Short-term goals"
                value={data.shortTermGoals}
                onChange={(event) => updateField('shortTermGoals', event.target.value)}
              />
              <Textarea
                label="Long-term goals"
                value={data.longTermGoals}
                onChange={(event) => updateField('longTermGoals', event.target.value)}
              />
              <Textarea
                label="Areas to improve"
                value={data.improvementAreas}
                onChange={(event) => updateField('improvementAreas', event.target.value)}
              />
              <Textarea
                label="Learning interests"
                placeholder="Topics or subjects you enjoy"
                value={data.learningInterests}
                onChange={(event) => updateField('learningInterests', event.target.value)}
              />
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-5">
              <Select
                label="Daily study target"
                value={data.dailyStudyTarget}
                onChange={(event) => updateField('dailyStudyTarget', event.target.value)}
              >
                {DAILY_TARGET_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>

              <div className="flex flex-col gap-2">
                <span className="text-label">Preferred study periods</span>
                <div className="grid grid-cols-2 gap-3">
                  {STUDY_PERIODS.map((period) => (
                    <Checkbox
                      key={period}
                      label={period}
                      checked={data.preferredStudyPeriods.includes(period)}
                      onChange={() => togglePeriod(period)}
                    />
                  ))}
                </div>
              </div>

              <Select
                label="Preferred session duration"
                value={data.preferredSessionDuration}
                onChange={(event) => updateField('preferredSessionDuration', event.target.value)}
              >
                {SESSION_DURATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>

              <Select
                label="Break duration"
                value={data.breakDuration}
                onChange={(event) => updateField('breakDuration', event.target.value)}
              >
                {BREAK_DURATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>

              <Input
                label="Timezone"
                hint="Detected automatically. Edit if this isn't right."
                value={data.timezone}
                onChange={(event) => updateField('timezone', event.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleBack} disabled={step === 1 || isSubmitting}>
              Previous
            </Button>

            {isLastStep ? (
              <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                Finish Setup
              </Button>
            ) : (
              <Button type="button" onClick={handleNext}>
                Continue
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
