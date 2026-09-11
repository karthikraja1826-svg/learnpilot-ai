import type { ReactNode } from 'react';

interface ProfileField {
  label: string;
  value?: ReactNode;
}

export function ProfileFieldGrid({ fields }: { fields: ProfileField[] }) {
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="flex flex-col gap-1">
          <dt className="text-label">{field.label}</dt>
          <dd className="text-body">
            {field.value === undefined || field.value === null || field.value === '' ? (
              <span className="text-text-muted">Not set</span>
            ) : (
              field.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
