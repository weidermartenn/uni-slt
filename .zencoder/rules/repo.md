# Repository Info

- **Name**: nuxt-app
- **Framework**: Nuxt 4 (Vue 3)
- **Language**: TypeScript
- **Package Manager Scripts**:
  - build: nuxt build
  - dev: nuxt dev
  - generate: nuxt generate
  - preview: nuxt preview
  - postinstall: nuxt prepare

## Key Dependencies
- **@nuxt/ui**: ^3.3.3
- **@pinia/nuxt**: ^0.11.2, **pinia**: ^3.0.3
- **@univerjs/presets**: ^0.10.8
- **@univerjs/preset-sheets-data-validation**: ^0.10.8
- **vue**: ^3.5.x, **vue-router**: ^4.5.x
- **typescript**: ^5.9.2

## Nuxt Config Highlights (nuxt.config.ts)
- **compatibilityDate**: 2025-07-15
- **modules**: '@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt'
- **css**: Univer Sheets styles included
- **nitro**: websockets enabled
- **runtimeConfig.public**:
  - wsBackendURI: wss:/kings-logix.ru
  - kingsApiBase: https://kings-logix.ru/api
  - sltApiBase: http://77.222.43.243:8080/api
- **app.head**: title "SLT"

## App Structure (selected)
- app/
  - assets/css/main.css
  - composables/
    - initUniver.ts — инициализация Univer API и создание Workbook
    - lifecycle.ts — реактивное состояние рендера Univer
  - pages/
    - sheet/index.vue — контейнер Univer, показ/скрытие fallback
  - stores/
    - sheet-store.ts — загрузка записей
    - validation-store.ts
- server/api/
  - auth, company, worktable endpoints

## UniverJS usage
- Создание Univer через `createUniver` (presets: Sheets Core, Data Validation)
- Генерация листов из данных, авто-fit колонок/строк, фриз хэдера
- Валидации добавляются через `addDataValidation`

## Known UX Flow
- На странице `/sheet` показывается лоадер (fallback) до рендера Univer
- После события `LifecycleStages.Rendered` fallback скрывается

## Local Development
- Запуск: `npm run dev` (http://localhost:3000)
- Production: `npm run build` → `npm run preview`

## Notes
- SSR отключен на странице листа (`definePageMeta({ ssr: false })`)
- В конфиге указаны публичные API/WS адреса — убедитесь, что они корректны для окружения разработки/продакшена.