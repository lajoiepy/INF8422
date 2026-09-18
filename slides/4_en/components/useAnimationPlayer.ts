import { onUnmounted, ref } from 'vue'
import { onSlideEnter, onSlideLeave } from '@slidev/client'

export interface AnimationPlayerOptions {
  /** Exécute UNE itération. Retourne false quand la simulation est terminée. */
  tick: () => boolean
  /** Remet la simulation dans son état initial. */
  reset: () => void
  /** Période du minuteur, en ms (défaut 30). */
  intervalMs?: number
  /** Itérations par battement au démarrage (défaut 1). */
  initialSpeed?: number
}

/**
 * Moteur de lecture continue des animations : la simulation tourne vraiment,
 * une itération à la fois, au lieu de rejouer un résultat pré-calculé.
 *
 * `speed` est le nombre d'itérations consommées par battement, pas un délai :
 * en salle on veut pouvoir passer de « une expansion à la fois » à « laisse
 * tourner jusqu'au bout » sans changer la fluidité du rendu.
 */
export function useAnimationPlayer(opts: AnimationPlayerOptions) {
  const { tick, reset, intervalMs = 30, initialSpeed = 1 } = opts

  const playing = ref(false)
  const done = ref(false)
  const speed = ref(initialSpeed)
  let timer: ReturnType<typeof setInterval> | null = null

  function clearTimer() {
    if (timer) clearInterval(timer)
    timer = null
  }

  function pause() {
    clearTimer()
    playing.value = false
  }

  /** Une itération, en tenant à jour l'état « terminé ». */
  function stepOnce() {
    if (done.value) return
    if (!tick()) {
      done.value = true
      pause()
    }
  }

  function beat() {
    for (let i = 0; i < speed.value; i++) {
      if (done.value) break
      if (!tick()) {
        done.value = true
        break
      }
    }
    if (done.value) pause()
  }

  function play() {
    if (done.value) restart()
    if (playing.value) return
    playing.value = true
    clearTimer()
    timer = setInterval(beat, intervalMs)
  }

  function toggle() {
    playing.value ? pause() : play()
  }

  function restart() {
    pause()
    done.value = false
    reset()
  }

  // Une simulation laissée en marche derrière la diapo courante plombe toute
  // la présentation : on coupe en sortant, on repart de zéro en entrant.
  onSlideEnter(restart)
  onSlideLeave(pause)
  onUnmounted(pause)

  return { playing, done, speed, play, pause, toggle, stepOnce, restart }
}
