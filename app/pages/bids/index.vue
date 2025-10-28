<template>
  <div>
    <!-- Контейнер для Univer -->
    <div id="app" class="univer-container"></div>
  </div>
</template>

<script setup lang="ts">
// Импорт стилей (порядок важен)
import '@univerjs/design/lib/index.css';
import '@univerjs/ui/lib/index.css';
import '@univerjs/docs-ui/lib/index.css';

// Импорт ядра и фасада
import { LocaleType, mergeLocales, Univer, UniverInstanceType } from '@univerjs/core';
import { FUniver } from '@univerjs/core/facade'; // Facade API

// Импорт плагинов
import { UniverDocsPlugin } from '@univerjs/docs';
import { UniverDocsUIPlugin } from '@univerjs/docs-ui';
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverUIPlugin } from '@univerjs/ui';

// Импорт языковых пакетов
import DesignRuRU from '@univerjs/design/locale/ru-RU';
import DocsUIRuRU from '@univerjs/docs-ui/locale/ru-RU';
import UIRuRU from '@univerjs/ui/locale/ru-RU';

// Импорт для регистрации Facade-сервисов (важно!)
import '@univerjs/engine-formula/facade';
import '@univerjs/ui/facade';
import '@univerjs/docs-ui/facade';

// Состояния компонента
const univerInstance = ref<Univer | null>(null);
const univerAPI = ref<ReturnType<typeof FUniver.newAPI> | null>(null);

onMounted(() => {
  initializeUniver();
});

onBeforeUnmount(() => {
  // Уничтожение экземпляра Univer при размонтировании компонента
  if (univerInstance.value) {
    univerInstance.value.dispose();
    univerInstance.value = null;
    univerAPI.value = null;
  }
});

function initializeUniver() {
  // Создание экземпляра Univer
  const univer = new Univer({
    locale: LocaleType.EN_US,
    locales: {
      [LocaleType.EN_US]: mergeLocales(
        DesignRuRU,
        UIRuRU,
        DocsUIRuRU,
      ),
    },
  });

  // Регистрация основных плагинов
  univer.registerPlugin(UniverRenderEnginePlugin); // Движок рендеринга
  univer.registerPlugin(UniverFormulaEnginePlugin); // Движок формул

  // Плагин UI (указываем контейнер)
  univer.registerPlugin(UniverUIPlugin, {
    container: 'app', 
    ribbonType: 'simple'
  });

  // Плагины для документов
  univer.registerPlugin(UniverDocsPlugin);
  univer.registerPlugin(UniverDocsUIPlugin);

  // Создание документа (пустой или с данными)
  univer.createUnit(UniverInstanceType.UNIVER_DOC, {});

  // Инициализация Facade API
  const api = FUniver.newAPI(univer);

  // Сохранение ссылок
  univerInstance.value = univer;
  univerAPI.value = api;

  console.log('Univer Doc инициализирован через Facade API');
}
</script>

<style scoped>
.univer-container {
  width: 100%;
  height: 90vh; /* Используем высоту из вашего класса h-[90vh] */
}
</style>