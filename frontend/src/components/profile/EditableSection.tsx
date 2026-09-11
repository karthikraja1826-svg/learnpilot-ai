import { useState, type ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface EditableSectionProps {
  title: string;
  description?: string;
  isSaving: boolean;
  onSave: () => Promise<void> | void;
  onCancel: () => void;
  renderView: () => ReactNode;
  renderEdit: () => ReactNode;
}

export function EditableSection({
  title,
  description,
  isSaving,
  onSave,
  onCancel,
  renderView,
  renderEdit,
}: EditableSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleCancel = () => {
    onCancel();
    setIsEditing(false);
  };

  const handleSave = async () => {
    await onSave();
    setIsEditing(false);
  };

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-section-heading">{title}</h2>
          {description && <p className="text-secondary">{description}</p>}
        </div>
        {!isEditing && (
          <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-5">
          {renderEdit()}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
              Save changes
            </Button>
          </div>
        </div>
      ) : (
        renderView()
      )}
    </Card>
  );
}
