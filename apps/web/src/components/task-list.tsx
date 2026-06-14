'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task } from '@task/shared';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { deleteTask, updateTask } from '@/lib/api';

interface TasksListResponse {
  items: Task[];
  total: number;
  page: number;
  pageSize: number;
}

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
}

/**
 * Mutate every cached `['tasks', …]` query — the same task can sit in
 * many filtered/sorted variations of the cache; without this, an
 * optimistic update on the current view would leave stale copies in
 * any sibling queries.
 */
const mutateAllTaskCaches = (
  queryClient: ReturnType<typeof useQueryClient>,
  fn: (data: TasksListResponse) => TasksListResponse,
) => {
  queryClient
    .getQueriesData<TasksListResponse>({ queryKey: ['tasks'] })
    .forEach(([key, data]) => {
      if (!data) return;
      queryClient.setQueryData(key, fn(data));
    });
};

const STATUS_CLASS: Record<Task['status'], string> = {
  todo: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
};

const PRIORITY_CLASS: Record<Task['priority'], string> = {
  low: 'text-zinc-500',
  medium: 'text-indigo-600 dark:text-indigo-400',
  high: 'text-red-600 dark:text-red-400 font-semibold',
};

const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
};

export const TaskList = ({ tasks, onEdit }: TaskListProps) => {
  const queryClient = useQueryClient();

  // Optimistic toggle: flip the status in every cached list immediately;
  // on error we restore from the snapshot we captured in onMutate.
  const toggleComplete = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      updateTask(id, { status: done ? 'done' : 'todo' }),
    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueriesData<TasksListResponse>({ queryKey: ['tasks'] });
      mutateAllTaskCaches(queryClient, (data) => ({
        ...data,
        items: data.items.map((t) =>
          t.id === id ? { ...t, status: done ? 'done' : 'todo' } : t,
        ),
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  // Optimistic delete: drop the row from every cached list (and
  // decrement total). Rollback on error from the snapshot.
  const remove = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueriesData<TasksListResponse>({ queryKey: ['tasks'] });
      mutateAllTaskCaches(queryClient, (data) => {
        const items = data.items.filter((t) => t.id !== id);
        const removed = items.length !== data.items.length ? 1 : 0;
        return { ...data, items, total: Math.max(0, data.total - removed) };
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        No tasks match your filters. Try creating one or clearing the filters.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
        const done = task.status === 'done';
        return (
          <li
            key={task.id}
            className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <input
              type="checkbox"
              checked={done}
              onChange={(e) => toggleComplete.mutate({ id: task.id, done: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
              aria-label={`Mark ${task.title} ${done ? 'incomplete' : 'complete'}`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={cn(
                    'text-sm font-medium',
                    done && 'line-through text-zinc-400 dark:text-zinc-500',
                  )}
                >
                  {task.title}
                </h3>
                <span className={cn('rounded px-2 py-0.5 text-xs font-medium', STATUS_CLASS[task.status])}>
                  {task.status.replace('_', ' ')}
                </span>
                <span className={cn('text-xs', PRIORITY_CLASS[task.priority])}>{task.priority}</span>
              </div>
              {task.description && (
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{task.description}</p>
              )}
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Due {formatDate(task.dueDate)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button size="sm" variant="ghost" onClick={() => onEdit(task)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (window.confirm(`Delete "${task.title}"?`)) remove.mutate(task.id);
                }}
              >
                Delete
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
