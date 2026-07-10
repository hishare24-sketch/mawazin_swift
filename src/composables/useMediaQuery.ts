import { onBeforeUnmount, onMounted, ref } from 'vue'

// استشعار تفاعليّ لاستعلام وسائط (matchMedia) — بلا تبعيّة لإطار خارجيّ.
export function useMediaQuery(query: string) {
  const matches = ref(false)
  let mq: MediaQueryList | null = null
  function update() {
    matches.value = !!mq?.matches
  }
  onMounted(() => {
    mq = window.matchMedia(query)
    update()
    mq.addEventListener('change', update)
  })
  onBeforeUnmount(() => mq?.removeEventListener('change', update))
  return matches
}
