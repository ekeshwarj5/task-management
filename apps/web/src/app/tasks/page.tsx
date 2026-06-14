'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Task } from '@task/shared';
import { Button } from '@/components/ui/Button';
import { TaskFilters, type FilterState } from '@/components/task-filters';
import { TaskList } from '@/components/task-list';
import { TaskFormDialog } from '@/components/task-form-dialog';
import { ApiError, listTasks, type ListTasksParams } from '@/lib/api';
import { useAuth } from '@/lib/auth-provider';

const PAGE_SIZE = 10;

export default function TasksPage() {
  const { user, status, signOut } = useAuth();
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
    sortBy: 'createdAt',
    sortDir: 'desc',
  });
  const [page, setPage] = useState(1);
  const [isCreating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const params: ListTasksParams = {
    page,
    pageSize: PAGE_SIZE,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    ...(filters.search && { search: filters.search }),
    ...(filters.status && { status: filters.status }),
  };

  const query = useQuery({
    queryKey: ['tasks', params],
    queryFn: () => listTasks(params),
    enabled: status === 'authenticated',
    placeholderData: (prev) => prev,
  });

  const updateFilters = (patch: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({ search: '', status: '', sortBy: 'createdAt', sortDir: 'desc' });
    setPage(1);
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <h1 className="text-lg font-semibold">Tasks</h1>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-zinc-500 sm:inline">{user?.email}</span>
            <Button size="sm" variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TaskFilters values={filters} onChange={updateFilters} onReset={resetFilters} />
          <Button onClick={() => setCreating(true)}>+ New task</Button>
        </div>

        {query.isError && (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            Failed to load tasks.{' '}
            {query.error instanceof ApiError ? query.error.message : 'Try again.'}
          </div>
        )}

        {query.isLoading && !query.data ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
            Loading tasks…
          </div>
        ) : (
          <TaskList tasks={query.data?.items ?? []} onEdit={setEditing} />
        )}

        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-500">
            <span>
              Page {page} of {totalPages} · {total} task{total === 1 ? '' : 's'}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </main>

      <TaskFormDialog open={isCreating} onClose={() => setCreating(false)} task={null} />
      <TaskFormDialog open={editing !== null} onClose={() => setEditing(null)} task={editing} />
    </div>
  );
}
