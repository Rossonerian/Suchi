import { useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskSchema } from '../../lib/task-schema.mjs';
import { Form, FormError, FormField, FormLabel } from '../forms/Form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

function taskValues(task) {
  return {
    title: task?.title || '',
    description: task?.description || '',
    subProblemRef: task?.subProblemRef ? String(task.subProblemRef) : '',
    dueDate: task?.dueDate ? String(task.dueDate).slice(0, 10) : '',
    assignee: task?.assignee?._id || task?.assignee || '',
    status: task?.status || 'todo',
  };
}

export default function TaskForm({ task, members = [], onSave, onCancel, submitLabel = 'Save task', compact = false }) {
  const form = useForm({ resolver: zodResolver(taskSchema), defaultValues: taskValues(task) });
  const { reset, formState: { isSubmitting } } = form;
  const idPrefix = `task-form-${useId().replace(/:/g, '')}`;
  const fieldId = (name) => `${idPrefix}-${name}`;

  useEffect(() => { reset(taskValues(task)); }, [task, reset]);

  async function submit(values) {
    const saved = await onSave({
      ...values,
      assignee: values.assignee || null,
      dueDate: values.dueDate || null,
    });
    if (saved && !task) reset(taskValues());
    return saved;
  }

  return (
    <Form {...form}>
      <form className={compact ? 'task-form task-form-compact' : 'task-form'} onSubmit={form.handleSubmit(submit)} noValidate>
        <div className="task-form-field">
          <FormLabel htmlFor={fieldId('title')}>Task title</FormLabel>
          <FormField name="title" control={form.control}>{({ field, fieldState }) => <Input {...field} id={fieldId('title')} aria-invalid={fieldState.invalid || undefined} aria-describedby={fieldState.invalid ? `${fieldId('title')}-error` : undefined} autoFocus maxLength="240" placeholder="Next concrete step" />}</FormField>
          <FormError name="title" id={`${fieldId('title')}-error`} />
        </div>
        {!compact && <div className="task-form-field"><FormLabel htmlFor={fieldId('description')}>Description</FormLabel><FormField name="description" control={form.control}>{({ field, fieldState }) => <Textarea {...field} id={fieldId('description')} aria-invalid={fieldState.invalid || undefined} aria-describedby={fieldState.invalid ? `${fieldId('description')}-error` : undefined} rows={4} placeholder="Context, dependency, or next action" />}</FormField><FormError name="description" id={`${fieldId('description')}-error`} /></div>}
        <div className="task-form-grid">
          <div className="task-form-field"><FormLabel htmlFor={fieldId('sub-problem')}>Sub-problem</FormLabel><FormField name="subProblemRef" control={form.control}>{({ field, fieldState }) => <Input {...field} id={fieldId('sub-problem')} aria-invalid={fieldState.invalid || undefined} aria-describedby={fieldState.invalid ? `${fieldId('sub-problem')}-error` : undefined} type="number" min="1" max="15" inputMode="numeric" placeholder="1–15" />}</FormField><FormError name="subProblemRef" id={`${fieldId('sub-problem')}-error`} /></div>
          {!compact && <div className="task-form-field"><FormLabel htmlFor={fieldId('due-date')}>Due date</FormLabel><FormField name="dueDate" control={form.control}>{({ field, fieldState }) => <Input {...field} id={fieldId('due-date')} aria-invalid={fieldState.invalid || undefined} type="date" />}</FormField></div>}
        </div>
        {!compact && <div className="task-form-grid">
          <div className="task-form-field"><FormLabel htmlFor={fieldId('status')}>Status</FormLabel><FormField name="status" control={form.control}>{({ field, fieldState }) => <select {...field} id={fieldId('status')} aria-invalid={fieldState.invalid || undefined}><option value="todo">To do</option><option value="in-progress">In progress</option><option value="blocked">Blocked</option><option value="done">Done</option></select>}</FormField></div>
          <div className="task-form-field"><FormLabel htmlFor={fieldId('assignee')}>Assignee</FormLabel><FormField name="assignee" control={form.control}>{({ field, fieldState }) => <select {...field} id={fieldId('assignee')} aria-invalid={fieldState.invalid || undefined}><option value="">Unassigned</option>{members.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select>}</FormField></div>
        </div>}
        <div className="task-form-actions"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : submitLabel}</Button>{onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}</div>
      </form>
    </Form>
  );
}
