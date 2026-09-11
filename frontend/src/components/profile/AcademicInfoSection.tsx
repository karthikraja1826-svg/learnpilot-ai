import { useState } from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { EditableSection } from './EditableSection';
import { ProfileFieldGrid } from './ProfileFieldGrid';
import type { UpdateProfileInput, UserProfile } from '../../types/user';

interface AcademicInfoSectionProps {
  profile: UserProfile;
  onSave: (input: UpdateProfileInput) => Promise<void>;
}

interface FormState {
  institution: string;
  degreeCourse: string;
  department: string;
  yearSemester: string;
  studentId: string;
  subjects: string;
  academicGoals: string;
}

function toFormState(profile: UserProfile): FormState {
  return {
    institution: profile.institution ?? '',
    degreeCourse: profile.degreeCourse ?? '',
    department: profile.department ?? '',
    yearSemester: profile.yearSemester ?? '',
    studentId: profile.studentId ?? '',
    subjects: (profile.subjects ?? []).join(', '),
    academicGoals: profile.academicGoals ?? '',
  };
}

export function AcademicInfoSection({ profile, onSave }: AcademicInfoSectionProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(profile));
  const [isSaving, setIsSaving] = useState(false);

  const handleCancel = () => setForm(toFormState(profile));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const subjects = form.subjects
        .split(',')
        .map((subject) => subject.trim())
        .filter(Boolean)
        .slice(0, 20);

      await onSave({
        institution: form.institution.trim(),
        degreeCourse: form.degreeCourse.trim(),
        department: form.department.trim(),
        yearSemester: form.yearSemester.trim(),
        studentId: form.studentId.trim(),
        subjects,
        academicGoals: form.academicGoals.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <EditableSection
      title="Academic Information"
      isSaving={isSaving}
      onSave={handleSave}
      onCancel={handleCancel}
      renderView={() => (
        <div className="flex flex-col gap-5">
          <ProfileFieldGrid
            fields={[
              { label: 'Institution', value: profile.institution },
              { label: 'Degree / Course', value: profile.degreeCourse },
              { label: 'Department / Specialization', value: profile.department },
              { label: 'Year / Semester', value: profile.yearSemester },
              { label: 'Student ID', value: profile.studentId },
              { label: 'Academic goals', value: profile.academicGoals },
            ]}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-label">Subjects</span>
            {(profile.subjects ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.subjects!.map((subject) => (
                  <Badge key={subject} tone="accent">
                    {subject}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-body text-text-muted">Not set</span>
            )}
          </div>
        </div>
      )}
      renderEdit={() => (
        <div className="flex flex-col gap-5">
          <Input
            label="Institution"
            value={form.institution}
            onChange={(event) => setForm((current) => ({ ...current, institution: event.target.value }))}
          />
          <Input
            label="Degree / course"
            value={form.degreeCourse}
            onChange={(event) => setForm((current) => ({ ...current, degreeCourse: event.target.value }))}
          />
          <Input
            label="Department / specialization"
            value={form.department}
            onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
          />
          <Input
            label="Year / semester"
            value={form.yearSemester}
            onChange={(event) => setForm((current) => ({ ...current, yearSemester: event.target.value }))}
          />
          <Input
            label="Student ID (optional)"
            value={form.studentId}
            onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))}
          />
          <Input
            label="Subjects"
            hint="Separate subjects with commas."
            placeholder="e.g. Calculus, Data Structures, Organic Chemistry"
            value={form.subjects}
            onChange={(event) => setForm((current) => ({ ...current, subjects: event.target.value }))}
          />
          <Textarea
            label="Academic goals"
            value={form.academicGoals}
            onChange={(event) => setForm((current) => ({ ...current, academicGoals: event.target.value }))}
          />
        </div>
      )}
    />
  );
}
