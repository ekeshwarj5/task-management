'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreateTaskSchema,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '@task/shared';
import { Dialog } from '@/components/ui/Dialog';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ApiError, createTask, updateTask } from '@/lib/api';

interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** When present, the dialog is in edit mode. */
  task?: Task | null;
}

interface FormValues {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
}

const empty: FormValues = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
};

const toForm = (task: Task | null | undefined): FormValues =>
  task
    ? {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ?? '',
      }
    : empty;

export const TaskFormDialog = ({ open, onClose, task }: TaskFormDialogProps) => {
  const isEdit = Boolean(task);
  const [values, setValues] = useState<FormValues>(toForm(task));
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues | 'form', string>>>({});
  const queryClient = useQueryClient();

  // Reset form when opening / switching target task.
  useEffect(() => {
    if (open) {
      setValues(toForm(task));
      setErrors({});
    }
  }, [open, task]);

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const payload = {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate || null,
      };
      if (task) return updateTask(task.id, payload);
      return createTask(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const candidate = {
      ...values,
      dueDate: values.dueDate || undefined,
    };
    const parsed = CreateTaskSchema.safeParse(candidate);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FormValues;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    mutation.mutate(values);
  };

  const update = (patch: Partial<FormValues>) => setValues((prev) => ({ ...prev, ...patch }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit task' : 'New task'}
      description={isEdit ? 'Update what changed.' : 'A title is required; everything else is optional.'}
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Title" htmlFor="title" error={errors.title}>
          <Input
            id="title"
            value={values.title}
            onChange={(e) => update({ title: e.target.value })}
            autoFocus
            required
          />
        </Field>

        <Field label="Description" htmlFor="description" error={errors.description}>
          <textarea
            id="description"
            value={values.description}
            onChange={(e) => update({ description: e.target.value })}
            rows={3}
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline focus:outline-2 focus:outline-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status" htmlFor="status" error={errors.status}>
            <Select
              id="status"
              value={values.status}
              onChange={(e) => update({ status: e.target.value as TaskStatus })}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority" htmlFor="priority" error={errors.priority}>
            <Select
              id="priority"
              value={values.priority}
              onChange={(e) => update({ priority: e.target.value as TaskPriority })}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Due date (optional)" htmlFor="dueDate" error={errors.dueDate}>
          <Input
            id="dueDate"
            type="date"
            value={values.dueDate}
            onChange={(e) => update({ dueDate: e.target.value })}
          />
        </Field>

        {mutation.isError && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {mutation.error instanceof ApiError ? mutation.error.message : 'Save failed.'}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create task'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
