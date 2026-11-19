# Дані вправ

- **Джерело:** [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (876 вправ, дані й картинки), ліцензія Unlicense (public domain). Версія зафіксована комітом у `build.mjs`.
- **Перебудувати:** `node scripts/exercises/build.mjs`, потім `pnpm db:seed`. Скрипт завантажує `dist/exercises.json`, додає переклади з `translations.json`, перевіряє значення за довідниками з `shared/src/dictionaries.ts`, докачує відсутні картинки в `api/static/exercises/` і пише `api/src/db/seed/exercises.json` та `review-top100.md`. Seed ідемпотентний (upsert за `external_id`).
- **Картинки** (~100 МБ) не комітяться (`.gitignore`), їх завантажує той самий скрипт.
- **Назви `nameUk` і популярність (1–10, 1 = найпопулярніша)** перекладено й виставлено AI з опорою на глосарій із проєкту dragon (`aggregated-exercises.json`). Правки вносити в `translations.json`, потім перезапустити скрипт і seed.
- **Топ-100** (`review-top100.md`) потребує ручної вичитки.
- У каталозі приховано категорії `stretching` і `cardio` (`HIDDEN_CATEGORIES` у `shared/src/dictionaries.ts`); у базі вони є.
