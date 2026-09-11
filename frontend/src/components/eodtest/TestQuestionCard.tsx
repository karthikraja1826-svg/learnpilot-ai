import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { ProgressBar } from '../ui/ProgressBar';
import { Textarea } from '../ui/Textarea';
import { cn } from '../../utils/cn';
import type { EodQuestion } from '../../types/eodTest';

interface TestQuestionCardProps {
  question: EodQuestion;
  index: number;
  total: number;
  answer: string;
  answeredCount: number;
  onAnswer: (value: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function TestQuestionCard({
  question,
  index,
  total,
  answer,
  answeredCount,
  onAnswer,
  onPrevious,
  onNext,
  onSubmit,
  isSubmitting,
}: TestQuestionCardProps) {
  const isLast = index === total - 1;

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <Badge tone="accent">{question.topicName}</Badge>
        <span className="text-caption">
          Question {index + 1} of {total}
        </span>
      </div>

      <ProgressBar value={answeredCount} max={total} label={`${answeredCount} of ${total} answered`} />

      <p className="text-section-heading">{question.questionText}</p>

      {question.questionType === 'multiple_choice' ? (
        <div className="flex flex-col gap-2">
          {question.options.map((option) => {
            const selected = answer === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onAnswer(option)}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-body transition-colors duration-250',
                  selected ? 'border-accent bg-accent-soft text-accent' : 'border-border hover:bg-accent-soft/50'
                )}
              >
                {option}
                {selected && <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      ) : (
        <Textarea
          value={answer}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="Type your answer here..."
          rows={4}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <IconButton aria-label="Previous question" onClick={onPrevious} disabled={index === 0}>
          <ChevronLeft className="h-4 w-4" />
        </IconButton>

        {isLast ? (
          <Button onClick={onSubmit} isLoading={isSubmitting} disabled={isSubmitting}>
            Submit Test
          </Button>
        ) : (
          <Button onClick={onNext}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
