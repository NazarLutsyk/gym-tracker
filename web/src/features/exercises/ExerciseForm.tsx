import type { ComponentProps } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from 'cn'
import {
  categorySchema,
  EQUIPMENT_LABELS,
  equipmentSchema,
  MUSCLE_LABELS,
  muscleSchema,
  type Category,
  type Equipment,
  type Muscle,
} from '@gym/shared'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api'
import { CATEGORY_OPTIONS, options } from './api'

/** Native select: the OS picker is the best UX on a phone. */
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-11 min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
      {...props}
    />
  )
}

const formSchema = z.object({
  name: z.string().trim().min(1, 'Введіть назву').max(100),
  category: categorySchema,
  equipment: equipmentSchema.or(z.literal('')),
  primaryMuscles: z.array(muscleSchema),
})

export type ExerciseFormValues = {
  name: string
  category: Category
  equipment: Equipment | null
  primaryMuscles: Muscle[]
}

type Props = {
  defaultValues?: Partial<ExerciseFormValues>
  submitLabel: string
  onSubmit: (values: ExerciseFormValues) => Promise<unknown>
}

export function ExerciseForm({ defaultValues, submitLabel, onSubmit }: Props) {
  const form = useForm<z.input<typeof formSchema>, unknown, z.output<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      category: defaultValues?.category ?? 'strength',
      equipment: defaultValues?.equipment ?? '',
      primaryMuscles: defaultValues?.primaryMuscles ?? [],
    },
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async ({ equipment, ...values }) => {
    try {
      await onSubmit({ ...values, equipment: equipment || null })
    } catch (e) {
      form.setError('root', { message: e instanceof ApiError ? e.message : 'Щось пішло не так. Спробуйте ще раз' })
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="exercise-name">Назва</FieldLabel>
          <Input id="exercise-name" className="h-11" aria-invalid={!!errors.name} {...form.register('name')} />
          <FieldError errors={[errors.name]} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="exercise-category">Категорія</FieldLabel>
            <NativeSelect id="exercise-category" {...form.register('category')}>
              {CATEGORY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="exercise-equipment">Обладнання</FieldLabel>
            <NativeSelect id="exercise-equipment" {...form.register('equipment')}>
              <option value="">Не вказано</option>
              {options(EQUIPMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <FieldSet>
          <FieldLegend variant="label">Основні м’язи</FieldLegend>
          <div className="grid grid-cols-2 gap-x-3">
            {options(MUSCLE_LABELS).map(([value, label]) => (
              <label key={value} className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" value={value} className="size-5 accent-primary" {...form.register('primaryMuscles')} />
                {label}
              </label>
            ))}
          </div>
        </FieldSet>

        <FieldError errors={[errors.root]} />
        <Button type="submit" className="h-11" disabled={isSubmitting}>
          {isSubmitting ? 'Зберігаємо…' : submitLabel}
        </Button>
      </FieldGroup>
    </form>
  )
}
