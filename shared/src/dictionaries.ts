// Values come from free-exercise-db. Labels are the Ukrainian UI text.
import { z } from 'zod';

export const CATEGORY_LABELS = {
  strength: 'Силові',
  powerlifting: 'Пауерліфтинг',
  'olympic weightlifting': 'Важка атлетика',
  strongman: 'Стронгмен',
  plyometrics: 'Пліометрика',
  stretching: 'Розтяжка',
  cardio: 'Кардіо',
} as const;

export const EQUIPMENT_LABELS = {
  barbell: 'Штанга',
  dumbbell: 'Гантелі',
  'e-z curl bar': 'EZ-гриф',
  kettlebells: 'Гирі',
  cable: 'Блок',
  machine: 'Тренажер',
  'body only': 'Власна вага',
  bands: 'Еспандер',
  'medicine ball': 'Медбол',
  'exercise ball': 'Фітбол',
  'foam roll': 'Масажний ролик',
  other: 'Інше',
} as const;

export const MUSCLE_LABELS = {
  chest: 'Груди',
  shoulders: 'Плечі',
  triceps: 'Трицепс',
  biceps: 'Біцепс',
  forearms: 'Передпліччя',
  lats: 'Найширші',
  'middle back': 'Середина спини',
  'lower back': 'Поперек',
  traps: 'Трапеції',
  neck: 'Шия',
  abdominals: 'Прес',
  quadriceps: 'Квадрицепс',
  hamstrings: 'Біцепс стегна',
  glutes: 'Сідниці',
  calves: 'Литки',
  adductors: 'Привідні м’язи',
  abductors: 'Відвідні м’язи',
} as const;

export const LEVEL_LABELS = {
  beginner: 'Початківець',
  intermediate: 'Середній',
  expert: 'Досвідчений',
} as const;

export const FORCE_LABELS = {
  push: 'Жим',
  pull: 'Тяга',
  static: 'Статика',
} as const;

export const MECHANIC_LABELS = {
  compound: 'Базова',
  isolation: 'Ізолююча',
} as const;

const keys = <T extends Record<string, string>>(o: T) =>
  Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

export const categorySchema = z.enum(keys(CATEGORY_LABELS));
export const equipmentSchema = z.enum(keys(EQUIPMENT_LABELS));
export const muscleSchema = z.enum(keys(MUSCLE_LABELS));
export const levelSchema = z.enum(keys(LEVEL_LABELS));
export const forceSchema = z.enum(keys(FORCE_LABELS));
export const mechanicSchema = z.enum(keys(MECHANIC_LABELS));

export type Category = z.infer<typeof categorySchema>;
export type Equipment = z.infer<typeof equipmentSchema>;
export type Muscle = z.infer<typeof muscleSchema>;
export type Level = z.infer<typeof levelSchema>;
export type Force = z.infer<typeof forceSchema>;
export type Mechanic = z.infer<typeof mechanicSchema>;

/** Categories not supported yet (no time/distance sets) — hidden from the catalog. */
export const HIDDEN_CATEGORIES: Category[] = ['stretching', 'cardio'];
