import { z } from 'zod'

// zod config is global (globalThis), so it also applies to schemas from @gym/shared.
// Short messages for the checks our schemas use; the uk locale covers the rest.
// Same map lives in api/src/common/zod-uk.ts.
z.config(z.locales.uk())
z.config({
  customError: (issue) => {
    const empty = issue.input === undefined || issue.input === null || issue.input === ''
    switch (issue.code) {
      case 'too_small':
        if (issue.origin === 'string') return Number(issue.minimum) <= 1 ? 'Обов’язкове поле' : `Мінімум ${issue.minimum} символів`
        if (issue.origin === 'number') return issue.inclusive === false ? `Більше ${issue.minimum}` : `Не менше ${issue.minimum}`
        return `Мінімум ${issue.minimum}`
      case 'too_big':
        if (issue.origin === 'string') return `Максимум ${issue.maximum} символів`
        if (issue.origin === 'number') return issue.inclusive === false ? `Менше ${issue.maximum}` : `Не більше ${issue.maximum}`
        return `Максимум ${issue.maximum}`
      case 'invalid_format':
        if (issue.format === 'email') return empty ? 'Обов’язкове поле' : 'Некоректний email'
        return 'Некоректний формат'
      case 'invalid_value':
        return 'Недопустиме значення'
      case 'invalid_type':
        if (empty) return 'Обов’язкове поле'
        if (issue.expected === 'int') return 'Має бути ціле число'
        if (issue.expected === 'number') return 'Має бути число'
        return 'Некоректне значення'
    }
    return undefined
  },
})
