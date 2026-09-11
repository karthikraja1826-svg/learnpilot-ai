import { MoreVertical, Pencil, Trash2, BookOpen } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { IconButton } from '../ui/IconButton';
import { Dropdown } from '../ui/Dropdown';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import type { Subject } from '../../types/academic';

interface SubjectCardProps {
  subject: Subject;
  topicCount: number;
  isSelected: boolean;
  onViewTopics: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SubjectCard({ subject, topicCount, isSelected, onViewTopics, onEdit, onDelete }: SubjectCardProps) {
  return (
    <Card
      className={cn(
        'flex flex-col gap-3 transition-colors duration-250',
        isSelected && 'border-accent ring-1 ring-accent/40'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: subject.color || '#ca704b' }}
            aria-hidden="true"
          />
          <h3 className="truncate text-section-heading">{subject.name}</h3>
        </div>
        <Dropdown
          trigger={
            <IconButton aria-label={`Actions for ${subject.name}`}>
              <MoreVertical className="h-4 w-4" />
            </IconButton>
          }
          items={[
            { label: 'Edit', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: onEdit },
            { label: 'Delete', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: onDelete, destructive: true },
          ]}
        />
      </div>

      {subject.description && <p className="text-secondary line-clamp-2">{subject.description}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">Difficulty {subject.difficulty}/5</Badge>
        <Badge tone="neutral">Importance {subject.importance}/5</Badge>
        <Badge tone="accent">
          {topicCount} {topicCount === 1 ? 'topic' : 'topics'}
        </Badge>
      </div>

      <ProgressBar
        value={subject.currentPerformance}
        label={`Current performance: ${Math.round(subject.currentPerformance)}%`}
      />

      <Button variant="secondary" size="sm" onClick={onViewTopics} className="mt-1 self-start">
        <BookOpen className="h-3.5 w-3.5" />
        View Topics
      </Button>
    </Card>
  );
}
