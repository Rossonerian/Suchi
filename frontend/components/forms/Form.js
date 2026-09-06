import { Controller, FormProvider, useFormContext } from 'react-hook-form';
import { Label } from '../ui/label';

export function Form({ children, ...form }) {
  return <FormProvider {...form}>{children}</FormProvider>;
}

export function FormField({ name, control, render, children, ...controllerProps }) {
  // Accept both the public render prop used by the task forms and the
  // children callback used by older consumers. Keeping both shapes makes the
  // shared primitive safe to adopt incrementally.
  const fieldRenderer = render || children;
  return <Controller name={name} control={control} render={fieldRenderer} {...controllerProps} />;
}

export function FormError({ name, id }) {
  const { formState: { errors } } = useFormContext();
  const message = errors[name]?.message;
  return message ? <p className="field-error" id={id || `${name}-error`} role="alert">{message}</p> : null;
}

export function FormLabel({ htmlFor, children }) {
  return <Label htmlFor={htmlFor}>{children}</Label>;
}
