<template>
    <div id="univerdoc" style="height: 90vh; margin: 0; padding: 0"></div>
</template>

<script setup lang="ts">
import { UniverDocsCorePreset } from '@univerjs/preset-docs-core'
import UniverPresetDocsCoreEnUS from '@univerjs/preset-docs-core/locales/en-US'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import '@univerjs/preset-docs-core/lib/index.css'
const { univerAPI } = createUniver({
  locale: LocaleType.EN_US,
  locales: {
    [LocaleType.EN_US]: mergeLocales(
      UniverPresetDocsCoreEnUS,
    ),
  },
  presets: [
    UniverDocsCorePreset(),
  ],
})
univerAPI.createUniverDoc({})
</script>

<style>
</style>