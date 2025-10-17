let audioContext: AudioContext | null = null

export function initAudioContext() {
  if (!audioContext && typeof window !== 'undefined') {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      console.error('Error initializing audio context:', error)
    }
  }
  return audioContext
}

export function playMessageSound() {
  try {
    const ctx = initAudioContext()
    if (!ctx) {
      console.warn('Audio context not available')
      return
    }

    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    const now = ctx.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15)

    oscillator.start(now)
    oscillator.stop(now + 0.15)

    console.log('🔔 Notification sound played')
  } catch (error) {
    console.error('Error playing notification sound:', error)
  }
}
