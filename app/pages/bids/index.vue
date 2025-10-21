<template>
    <div id="univerdoc"></div>
</template>

<script setup lang="ts">
import { UniverDocsCorePreset } from '@univerjs/preset-docs-core'
import UniverPresetDocsCoreEnUS from '@univerjs/preset-docs-core/locales/en-US'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import type { IDocumentData } from '@univerjs/core'
import '@univerjs/preset-docs-core/lib/index.css'

// Минимальный документ с текстом
const simpleDocument: IDocumentData = {
    id: 'simple-doc',
    documentStyle: {
        pageSize: {
            width: 595,
            height: 842,
        },
        marginTop: 72,
        marginBottom: 72,
        marginRight: 72,
        marginLeft: 72,
    },
    body: {
        dataStream: 'Привет, это простой документ!\r\nВы можете начать редактирование прямо сейчас.\r\n',
        paragraphs: [
            {
                startIndex: 0,
            },
            {
                startIndex: 31,
            }
        ]
    }
}

onMounted(() => {
    const { univerAPI } = createUniver({
        locale: LocaleType.EN_US,
        locales: {
            [LocaleType.EN_US]: mergeLocales(UniverPresetDocsCoreEnUS),
        },
        presets: [
            UniverDocsCorePreset({
                container: 'univerdoc',
                ribbonType: 'simple'
            }),
        ],
    })
    
    univerAPI.createUniverDoc(simpleDocument)
})
</script>