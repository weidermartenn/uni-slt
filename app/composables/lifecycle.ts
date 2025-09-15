import { ref } from 'vue'
import type { FUniver } from '@univerjs/presets'

// Returns rendered ref and an unsubscribe function to be cleaned up by the caller
export function getLifeCycleState(api: FUniver) {
  const rendered = ref(false)

  const off: any = api.addEvent(api.Event.LifeCycleChanged, (p: { stage: any }) => {
    if (p.stage === api.Enum.LifecycleStages.Rendered) {
      rendered.value = true
    }
  })

  return { rendered, off }
}