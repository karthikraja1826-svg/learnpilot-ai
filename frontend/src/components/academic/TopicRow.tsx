import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/IconButton';
import { Dropdown } from '../ui/Dropdown';
import type { Topic } from '../../types/academic';

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'error';

interface TopicRowProps {
  topic: Topic;
  onEdit: () => void;
  onDelete: () => void;
}

const STATUS_LABEL: Record<Topic['status'], string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  needs_revision: 'Needs revision',
};

const STATUS_TONE: Record<Topic['status'], BadgeTone> = {
  not_started: 'neutral',
  in_progress: 'accent',
  completed: 'success',
  needs_revision: 'warning',
};

export function TopicRow({ topic, onEdit, onDelete }: TopicRowProps) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border px-3.5 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-body font-medium">{topic.name}</span>
        {topic.description && <span className="truncate text-caption">{topic.description}</span>}
      </div>
      <span className="hidden shrink-0 text-caption sm:inline">{topic.estimatedHours}h estimated</span>
      <span className="hidden shrink-0 text-caption sm:inline">{Math.round(topic.currentMastery)}% mastery</span>
      <Badge tone={STATUS_TONE[topic.status]}>{STATUS_LABEL[topic.status]}</Badge>
      <Dropdown
        trigger={
          <IconButton aria-label={`Actions for ${topic.name}`}>
            <MoreVertical className="h-4 w-4" />
          </IconButton>
        }
        items={[
          { label: 'Edit', icon: <Pencil className="h-3.5 w-3.5" />, onSelect: onEdit },
          { label: 'Delete', icon: <Trash2 className="h-3.5 w-3.5" />, onSelect: onDelete, destructive: true },
        ]}
      />
    </li>
  );
}
