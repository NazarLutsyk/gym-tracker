import { createBrowserRouter, Navigate } from 'react-router'
import { LoginPage, RegisterPage } from '@/features/auth/pages'
import { ExercisePage, ExercisesPage } from '@/features/exercises/pages'
import { HistoryDetailPage, HistoryPage } from '@/features/history/pages'
import { NewWorkoutPage, WorkoutPage, WorkoutsPage } from '@/features/workouts/pages'
import { AppLayout, GuestLayout, NotFoundPage } from './layouts'

export const router = createBrowserRouter([
  {
    Component: GuestLayout,
    children: [
      { path: '/login', Component: LoginPage },
      { path: '/register', Component: RegisterPage },
    ],
  },
  {
    Component: AppLayout,
    children: [
      { path: '/', element: <Navigate to="/workouts" replace /> },
      { path: '/workouts', Component: WorkoutsPage },
      { path: '/workouts/new', Component: NewWorkoutPage },
      { path: '/workouts/:id', Component: WorkoutPage },
      { path: '/history', Component: HistoryPage },
      { path: '/history/:id', Component: HistoryDetailPage },
      { path: '/exercises', Component: ExercisesPage },
      { path: '/exercises/:id', Component: ExercisePage },
      { path: '*', Component: NotFoundPage },
    ],
  },
])
