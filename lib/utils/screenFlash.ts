import type { NotificationSoundMode } from '@/store/notificationSettings'

const FLASH_DURATION_MS = 500   // total duration of one blink
const REPEAT_INTERVAL_MS = 2200 // matches bell repeat cadence
const UNTIL_CLICK_INTERVAL_MS = 3000 // matches bell until_click cadence

function ensureOverlay(): HTMLDivElement {
  let el = document.getElementById('wehanda-screen-flash') as HTMLDivElement | null
  if (!el) {
    // Inject keyframe once
    if (!document.getElementById('wehanda-flash-style')) {
      const style = document.createElement('style')
      style.id = 'wehanda-flash-style'
      style.textContent = `
        @keyframes wehanda-flash {
          0%   { opacity: 0; }
          20%  { opacity: 1; }
          100% { opacity: 0; }
        }
        #wehanda-screen-flash.flash {
          animation: wehanda-flash ${FLASH_DURATION_MS}ms ease-out forwards;
        }
      `
      document.head.appendChild(style)
    }

    el = document.createElement('div')
    el.id = 'wehanda-screen-flash'
    Object.assign(el.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '9998',
      pointerEvents: 'none',
      background: 'oklch(61% 0.208 256 / 0.22)', // brand-500 at low opacity
      opacity: '0',
    })
    document.body.appendChild(el)
  }
  return el
}

function doFlash() {
  if (typeof document === 'undefined') return
  const overlay = ensureOverlay()
  overlay.classList.remove('flash')
  void overlay.offsetWidth // force reflow to restart animation
  overlay.classList.add('flash')
}

export function triggerFlash(
  mode: NotificationSoundMode,
  repeatCount: number,
  cleanupRef: React.MutableRefObject<() => void>,
) {
  if (mode === 'none') return

  if (mode === 'repeat') {
    let count = 0
    function blink() {
      if (count >= repeatCount) return
      doFlash()
      count++
      if (count < repeatCount) setTimeout(blink, REPEAT_INTERVAL_MS)
    }
    blink()
    return
  }

  // until_click — cancel any prior running session for this channel
  cleanupRef.current()

  let active = true
  let timeoutId: ReturnType<typeof setTimeout>

  function blink() {
    if (!active) return
    doFlash()
    timeoutId = setTimeout(blink, UNTIL_CLICK_INTERVAL_MS)
  }

  function stopOnClick() {
    active = false
    clearTimeout(timeoutId)
  }

  cleanupRef.current = () => {
    active = false
    clearTimeout(timeoutId)
    document.removeEventListener('click', stopOnClick, true)
  }

  document.addEventListener('click', stopOnClick, { once: true, capture: true })
  blink()
}
