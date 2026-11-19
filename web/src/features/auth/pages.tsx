import type { ReactNode } from 'react'
import { useForm, type FieldError as FormError, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import { loginSchema, registerSchema } from '@gym/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api'
import { useAuth } from './use-auth'

// On success the token appears in AuthContext and GuestLayout redirects to /workouts.

export function LoginPage() {
  const { login } = useAuth()
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values)
    } catch (e) {
      form.setError('root', { message: serverMessage(e) })
    }
  })

  return (
    <AuthCard
      title="Вхід"
      footer={<>Немає акаунта? <Link to="/register">Зареєструватися</Link></>}
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <TextField label="Email" type="email" autoComplete="email" placeholder="name@example.com" error={errors.email} {...form.register('email')} />
          <TextField label="Пароль" type="password" autoComplete="current-password" error={errors.password} {...form.register('password')} />
          <FieldError errors={[errors.root]} />
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Входимо…' : 'Увійти'}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await register(values)
    } catch (e) {
      form.setError('root', { message: serverMessage(e) })
    }
  })

  return (
    <AuthCard
      title="Реєстрація"
      footer={<>Вже маєте акаунт? <Link to="/login">Увійти</Link></>}
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <TextField label="Ім’я" autoComplete="name" error={errors.name} {...form.register('name')} />
          <TextField label="Email" type="email" autoComplete="email" placeholder="name@example.com" error={errors.email} {...form.register('email')} />
          <TextField label="Пароль" type="password" autoComplete="new-password" error={errors.password} hint="Щонайменше 8 символів" {...form.register('password')} />
          <FieldError errors={[errors.root]} />
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Реєструємо…' : 'Зареєструватися'}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}

function serverMessage(e: unknown) {
  if (e instanceof ApiError) return e.message
  return 'Щось пішло не так. Спробуйте ще раз'
}

function AuthCard({ title, footer, children }: { title: string; footer: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <img src="/favicon.svg" alt="" className="size-7" />
        Gym Tracker
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {children}
          <FieldDescription className="text-center">{footer}</FieldDescription>
        </CardContent>
      </Card>
    </div>
  )
}

type TextFieldProps = UseFormRegisterReturn & {
  label: string
  type?: string
  autoComplete?: string
  placeholder?: string
  hint?: string
  error?: FormError
}

function TextField({ label, hint, error, ...input }: TextFieldProps) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={input.name}>{label}</FieldLabel>
      <Input id={input.name} aria-invalid={!!error} className="h-10" {...input} />
      {hint && !error && <FieldDescription>{hint}</FieldDescription>}
      <FieldError errors={[error]} />
    </Field>
  )
}
