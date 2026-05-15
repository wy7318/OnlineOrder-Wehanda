export function playBell() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    ;[
      { freq: 880,  gain: 0.5 },
      { freq: 1108, gain: 0.3 },
      { freq: 1480, gain: 0.2 },
    ].forEach(({ freq, gain: g }, i) => {
      const osc      = ctx.createOscillator()
      const gainNode = ctx.createGain()
      osc.connect(gainNode)
      gainNode.connect(ctx.destination)
      osc.type          = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.05
      gainNode.gain.setValueAtTime(0, t)
      gainNode.gain.linearRampToValueAtTime(g, t + 0.005)
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + 2)
      osc.start(t)
      osc.stop(t + 2)
    })
  } catch {
    // audio unavailable in this context
  }
}
