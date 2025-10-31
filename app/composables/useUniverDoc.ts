// composables/useUniverDoc.ts
import { LocaleType, mergeLocales, Univer, UniverInstanceType } from '@univerjs/core';
import { FUniver } from '@univerjs/core/facade';
import { UniverDocsPlugin } from '@univerjs/docs';
import { UniverDocsUIPlugin } from '@univerjs/docs-ui';
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverUIPlugin } from '@univerjs/ui';
import DesignRuRU from '@univerjs/design/locale/ru-RU';
import DocsUIRuRU from '@univerjs/docs-ui/locale/ru-RU';
import UIRuRU from '@univerjs/ui/locale/ru-RU';

// Импорт для регистрации Facade-сервисов
import '@univerjs/engine-formula/facade';
import '@univerjs/ui/facade';
import '@univerjs/docs-ui/facade';

export interface UniverDocInstance {
  univer: Univer;
  univerAPI: ReturnType<typeof FUniver.newAPI>;
  dispose: () => void;
}

export const useUniverDoc = () => {
  const univerInstance = shallowRef<UniverDocInstance | null>(null);
  const isInitialized = ref(false);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  /**
   * Инициализирует Univer Document
   */
  const initialize = async (
    containerId: string = 'app',
    locale: LocaleType = LocaleType.RU_RU
  ): Promise<UniverDocInstance> => {
    if (isInitialized.value) {
      console.warn('Univer Doc уже инициализирован');
      return univerInstance.value!;
    }

    isLoading.value = true;
    error.value = null;

    try {
      // Создание экземпляра Univer с русской локалью
      const univer = new Univer({
        locale: LocaleType.RU_RU,
        locales: {
          [LocaleType.RU_RU]: mergeLocales(
            DesignRuRU,
            UIRuRU,
            DocsUIRuRU,
          ),
        },
      });

      // Регистрация основных плагинов
      univer.registerPlugin(UniverRenderEnginePlugin);
      univer.registerPlugin(UniverFormulaEnginePlugin);

      // Плагин UI с упрощенной лентой и русской локалью
      univer.registerPlugin(UniverUIPlugin, {
        container: containerId,
        ribbonType: 'simple' // Упрощенная лента
      });

      // Плагины для документов
      univer.registerPlugin(UniverDocsPlugin);
      univer.registerPlugin(UniverDocsUIPlugin);

      // Создание документа (пустой или с данными)
      univer.createUnit(UniverInstanceType.UNIVER_DOC, {});

      // Инициализация Facade API
      const univerAPI = FUniver.newAPI(univer);

      const instance: UniverDocInstance = {
        univer,
        univerAPI,
        dispose: () => {
          univer.dispose();
          isInitialized.value = false;
          univerInstance.value = null;
        }
      };

      univerInstance.value = instance;
      isInitialized.value = true;

      return instance;

    } catch (err) {
      error.value = err as Error;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Создает документ с данными
   */
  const createDocument = (documentData: any = {}) => {
    if (!univerInstance.value) {
      throw new Error('Univer Doc не инициализирован. Сначала вызовите initialize()');
    }
    return univerInstance.value.univerAPI.createUniverDoc(documentData);
  };

  /**
   * Получает активный документ
   */
  const getActiveDocument = () => {
    if (!univerInstance.value) return null;
    try {
      return univerInstance.value.univerAPI.getActiveDocument();
    } catch (error) {
      console.error('Ошибка получения документа:', error);
      return null;
    }
  };

  /**
   * Уничтожает экземпляр Univer
   */
  const dispose = () => {
    if (univerInstance.value) {
      univerInstance.value.dispose();
    }
  };

  // Автоматическая очистка при размонтировании компонента
  onUnmounted(() => {
    dispose();
  });

  return {
    // State
    univerInstance,
    isInitialized: readonly(isInitialized),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Methods
    initialize,
    createDocument,
    getActiveDocument,
    dispose
  };
};