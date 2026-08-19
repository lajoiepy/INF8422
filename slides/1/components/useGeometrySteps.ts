import { computed, ref } from 'vue'
import { onSlideEnter, onSlideLeave } from '@slidev/client'

export function useGeometrySteps(total: number, delay = 1500) {
  const step = ref(0)
  const playing = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  function clearTimer() {
    if (timer) clearTimeout(timer)
    timer = null
  }

  function go(delta: 1 | -1) {
    clearTimer()
    playing.value = false
    step.value = Math.max(0, Math.min(total - 1, step.value + delta))
  }

  function tick() {
    if (step.value >= total - 1) {
      playing.value = false
      clearTimer()
      return
    }
    step.value++
    timer = setTimeout(tick, delay)
  }

  function toggleAuto() {
    if (playing.value) {
      playing.value = false
      clearTimer()
      return
    }
    if (step.value >= total - 1) step.value = 0
    playing.value = true
    timer = setTimeout(tick, 250)
  }

  function reset() {
    clearTimer()
    playing.value = false
    step.value = 0
  }

  onSlideEnter(reset)
  onSlideLeave(() => {
    clearTimer()
    playing.value = false
  })

  return {
    step,
    playing,
    isFirst: computed(() => step.value === 0),
    isLast: computed(() => step.value === total - 1),
    go,
    toggleAuto,
    reset,
  }
}
