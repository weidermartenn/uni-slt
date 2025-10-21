import type { FUniver } from "@univerjs/presets";
import { useUniverStore } from "~/stores/univer-store";

export async function initUniverDoc(): Promise<FUniver> {
    if (typeof window === 'undefined') throw new Error('initUniverDoc must be called on the client');

    const univerStore = useUniverStore();

    univerStore.setBatchProgress(true);
    univerStore.beginQuiet();
    univerStore.setUiReady(false);

    const [
        { createUniver, LocaleType, mergeLocales },
        { UniverDocsCorePreset },
        UniverPresetDocsCoreEnUS, UniverPresetDocsCoreRuRU
    ] = await Promise.all([
        import('@univerjs/presets'),
        import('@univerjs/preset-docs-core'),
        import('@univerjs/preset-docs-core/locales/en-US'),
        import('@univerjs/preset-docs-core/locales/ru-RU')
    ]);

    const { univer, univerAPI } = createUniver({
        locale: LocaleType.RU_RU,
        locales: {
            [LocaleType.EN_US]: mergeLocales(
                UniverPresetDocsCoreEnUS
            ),
            [LocaleType.RU_RU]: mergeLocales( 
                UniverPresetDocsCoreRuRU
            ),
        },
        presets: [
            UniverDocsCorePreset({
                container: 'univerdoc',
                ribbonType: 'simple',
            })
        ]
    })

    univerStore.setUniver(univerAPI);

    await nextTick() 
    await new Promise(r => requestAnimationFrame(() => r(null)))

    univerStore.setUiReady(true);
    univerStore.endQuiet();
    univerStore.setBatchProgress(false);

    return univerAPI
}