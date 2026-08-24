import { useState, useTransition } from "react";
import { z } from "zod";
import { fieldErrorsFromZod } from "@/lib/validation";

/**
 * Shared form action hook that eliminates the boilerplate of:
 * - error state
 * - fieldErrors state
 * - isPending / startTransition
 * - Zod validation → fieldErrors mapping
 * - action execution with error handling
 *
 * Usage:
 * ```tsx
 * const { error, fieldErrors, isPending, handleSubmit } = useFormAction({
 *   schema: taskSchema,
 *   action: async (formData) => updateTaskAction(id, formData),
 *   onSuccess: () => onOpenChange(false),
 * });
 * ```
 */
export function useFormAction({
  schema,
  action,
  onSuccess,
  onError,
}: {
  schema: z.ZodObject<z.ZodRawShape>;
  action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    // Build a plain object from FormData for Zod validation
    const data: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setFieldErrors({});
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        onSuccess?.();
      } else {
        const msg = result.error ?? "Something went wrong";
        setError(msg);
        onError?.(msg);
      }
    });
  }

  function resetErrors() {
    setError(null);
    setFieldErrors({});
  }

  return { error, fieldErrors, isPending, handleSubmit, resetErrors, setError };
}
