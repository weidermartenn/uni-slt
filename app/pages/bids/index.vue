<template>
  <div>
    <!-- Состояние загрузки -->
    <div v-if="isLoading" class="loading">
      Инициализация Univer Doc...
    </div>
    
    <!-- Состояние ошибки -->
    <div v-else-if="error" class="error">
      Ошибка: {{ error.message }}
    </div>
    
    <!-- Основной контент -->
    <div v-else>
      <!-- Контейнер для Univer -->
      <div id="app" class="univer-container"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Импорт стилей
import '@univerjs/design/lib/index.css';
import '@univerjs/ui/lib/index.css';
import '@univerjs/docs-ui/lib/index.css';

const {
  initialize,
  dispose,
  univerInstance,
  isInitialized,
  isLoading,
  error,
  getActiveDocument
} = useUniverDoc();

onMounted(async () => {
  try {
    await initialize('app');
    
    // Даем время на полную инициализацию UI
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Получаем документ
    const doc = getActiveDocument();
    if (!doc) {
      console.log('Документ не найден');
      return;
    }
    
    // Добавляем текст с обработкой ошибок
    try {
      doc.appendText('Добро пожаловать в Univer!');
      console.log('Текст успешно добавлен');
    } catch (err) {
      console.error('Ошибка добавления текста:', err);
    }
    
  } catch (err) {
    console.error('Ошибка инициализации Univer Doc:', err);
  }
});

onBeforeUnmount(() => {
  dispose();
});
</script>

<style scoped>
.univer-container {
  width: 100%;
  height: 90vh;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 90vh;
  font-size: 18px;
  color: #666;
}

.error {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 90vh;
  font-size: 18px;
  color: #d32f2f;
  background-color: #ffebee;
  padding: 20px;
  border-radius: 8px;
  margin: 20px;
}
</style>