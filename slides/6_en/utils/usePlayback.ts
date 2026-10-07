import { ref, watch, onUnmounted } from 'vue'
import { useIsSlideActive } from '@slidev/client'

// Based on the course 5 activity-aware playback helper.
export function usePlayback(tick: () => boolean | void, reset: () => void, period = 600) {
  const playing = ref(false)
  const active = useIsSlideActive()
  let timer: ReturnType<typeof setInterval> | undefined
  const stop = () => { if (timer) clearInterval(timer); timer = undefined }
  watch([playing, active], () => {
    stop()
    if (!active.value) playing.value = false
    if (active.value && playing.value) timer = setInterval(() => {
      if (tick() === false) playing.value = false
    }, period)
  })
  watch(active, (value) => { if (value) reset() })
  onUnmounted(stop)
  return { playing, active }
}
