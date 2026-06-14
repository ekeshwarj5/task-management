'use client';

import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { TASK_STATUSES, TASK_SORT_FIELDS, type TaskStatus, type TaskSortField, type SortDirection } from '@task/shared';

export interface FilterState {
  search: string;
  status: TaskStatus | '';
  sortBy: TaskSortField;
  sortDir: SortDirection;
}

interface TaskFiltersProps {
  values: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  onReset: () => void;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

const SORT_LABELS: Record<TaskSortField, string> = {
  createdAt: 'Created',
  dueDate: 'Due date',
  priority: 'Priority',
};

export const TaskFilters = ({ values, onChange, onReset }: TaskFiltersProps) => {
  const dirty = values.search !== '' || values.status !== '';

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
      <div className="flex-1">
        <Input
          type="search"
          aria-label="Search by title"
          placeholder="Search by title…"
          value={values.search}
          onChange={(e) => onChange({ search: e.target.value })}
        />
      </div>
      <Select
        aria-label="Filter by status"
        value={values.status}
        onChange={(e) => onChange({ status: (e.target.value || '') as TaskStatus | '' })}
        className="sm:w-44"
      >
        <option value="">All statuses</option>
        {TASK_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Sort by"
        value={values.sortBy}
        onChange={(e) => onChange({ sortBy: e.target.value as TaskSortField })}
        className="sm:w-40"
      >
        {TASK_SORT_FIELDS.map((field) => (
          <option key={field} value={field}>
            Sort by {SORT_LABELS[field].toLowerCase()}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Sort direction"
        value={values.sortDir}
        onChange={(e) => onChange({ sortDir: e.target.value as SortDirection })}
        className="sm:w-32"
      >
        <option value="desc">Newest first</option>
        <option value="asc">Oldest first</option>
      </Select>
      <Button variant="ghost" size="sm" onClick={onReset} disabled={!dirty}>
        Clear
      </Button>
    </div>
  );
};
