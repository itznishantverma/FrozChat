class UsernameGenerator {
  private static instance: UsernameGenerator
  private adjectives: string[] = [
    'Frozen', 'Icy', 'Glacial', 'Arctic', 'Chill', 'Frost', 'Crystal', 'Snow',
    'Winter', 'Cold', 'Blizzard', 'Polar', 'Ice', 'Freezing', 'Crisp',
    'Silent', 'Mystic', 'Swift', 'Bold', 'Gentle', 'Wild', 'Bright',
    'Dark', 'Ancient', 'Noble', 'Fierce', 'Calm', 'Proud', 'Free',
    'Pure', 'Strong', 'Wise', 'Quick', 'Brave', 'Kind', 'Cool', 'Sharp'
  ]

  private nouns: string[] = [
    'Wolf', 'Fox', 'Bear', 'Eagle', 'Dragon', 'Phoenix', 'Tiger', 'Lion',
    'Hawk', 'Owl', 'Raven', 'Falcon', 'Panther', 'Leopard', 'Jaguar',
    'Walker', 'Hunter', 'Guardian', 'Knight', 'Warrior', 'Mage', 'Sage',
    'Storm', 'Thunder', 'Lightning', 'Wind', 'Flame', 'Shadow', 'Light',
    'Crystal', 'Diamond', 'Sapphire', 'Ruby', 'Emerald', 'Pearl', 'Star',
    'Moon', 'Sun', 'Comet', 'Meteor', 'Galaxy', 'Nebula', 'Void'
  ]

  private frozenThemes: string[] = [
    'FrostWalker', 'IceCrystal', 'SnowDrift', 'FrozenSoul', 'ChillWind',
    'WinterStorm', 'GlacialFlow', 'ArcticFox', 'BlizzardRage', 'IcicleSharp',
    'FrostBite', 'SnowflakeWish', 'IcebergTip', 'CrystalCave', 'WinterMoon',
    'FrozenLake', 'IceQueen', 'SnowAngel', 'ChillBreeze', 'FrostFlower',
    'GlacierPeak', 'IceStorm', 'SnowKing', 'WinterWind', 'FrozenStar',
    'CrystalWing', 'IceBlade', 'FrostGuard', 'SnowLion', 'WinterSage',
    'FrozenHeart', 'IcePhoenix', 'GlacialTiger', 'ArcticWolf', 'BlizzardEagle'
  ]

  private constructor() {}

  static getInstance(): UsernameGenerator {
    if (!UsernameGenerator.instance) {
      UsernameGenerator.instance = new UsernameGenerator()
    }
    return UsernameGenerator.instance
  }

  generateUsername(): string {
    const strategies = [
      this.generateFrozenTheme.bind(this),
      this.generateAdjectiveNoun.bind(this),
      this.generateWithNumbers.bind(this)
    ]

    const strategy = strategies[Math.floor(Math.random() * strategies.length)]
    return strategy()
  }

  private generateFrozenTheme(): string {
    const base = this.frozenThemes[Math.floor(Math.random() * this.frozenThemes.length)]
    const number = Math.floor(Math.random() * 9999) + 1
    return `${base}${number}`
  }

  private generateAdjectiveNoun(): string {
    const adjective = this.adjectives[Math.floor(Math.random() * this.adjectives.length)]
    const noun = this.nouns[Math.floor(Math.random() * this.nouns.length)]
    const number = Math.floor(Math.random() * 999) + 1
    return `${adjective}${noun}${number}`
  }

  private generateWithNumbers(): string {
    const base = this.frozenThemes[Math.floor(Math.random() * this.frozenThemes.length)]
    const timestamp = Date.now().toString().slice(-4)
    return `${base}${timestamp}`
  }

  async generateUniqueUsername(checkExistence: (username: string) => Promise<boolean>): Promise<string> {
    let attempts = 0
    const maxAttempts = 50

    while (attempts < maxAttempts) {
      const username = this.generateUsername()
      const exists = await checkExistence(username)

      if (!exists) {
        return username
      }

      attempts++
    }

    // Fallback with timestamp to ensure uniqueness
    const timestamp = Date.now()
    return `FrozenUser${timestamp}`
  }

  validateUsername(username: string): { isValid: boolean; error?: string } {
    if (username.length < 3) {
      return { isValid: false, error: 'Username must be at least 3 characters long' }
    }

    if (username.length > 20) {
      return { isValid: false, error: 'Username must be less than 20 characters long' }
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' }
    }

    return { isValid: true }
  }

  generateBatchUsernames(count: number): string[] {
    const usernames = new Set<string>()

    while (usernames.size < count) {
      usernames.add(this.generateUsername())
    }

    return Array.from(usernames)
  }
}

export default UsernameGenerator