interface IPDetails {
  ip: string
  country: string
  countryCode: string
  region: string
  regionName: string
  city: string
  zip: string
  lat: number
  lon: number
  timezone: string
  isp: string
  org: string
  as: string
  mobile: boolean
  proxy: boolean
  hosting: boolean
}

interface DeviceInfo {
  userAgent: string
  platform: string
  language: string
  languages: string[]
  screen: {
    width: number
    height: number
    colorDepth: number
  }
  timezone: string
  cookieEnabled: boolean
  onLine: boolean
  deviceMemory?: number
  hardwareConcurrency?: number
  connection?: {
    effectiveType?: string
    downlink?: number
    rtt?: number
  }
}

class IPService {
  private static instance: IPService
  private cache: Map<string, { data: IPDetails; timestamp: number }> = new Map()
  private cacheTimeout = 1000 * 60 * 60 * 24 // 24 hours

  private constructor() {}

  static getInstance(): IPService {
    if (!IPService.instance) {
      IPService.instance = new IPService()
    }
    return IPService.instance
  }

  async getIPDetails(): Promise<IPDetails | null> {
    try {
      const cacheKey = 'current'
      const cached = this.cache.get(cacheKey)

      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }

      // Try multiple APIs in sequence
      const apis = [
        this.fetchFromIPify,
        this.fetchFromFreeGeoIP,
        this.fetchFromIPAPI
      ]

      for (const api of apis) {
        try {
          const result = await api()
          if (result) {
            this.cache.set(cacheKey, { data: result, timestamp: Date.now() })
            return result
          }
        } catch (error) {
          console.warn(`IP API failed, trying next:`, error)
          continue
        }
      }

      // Fallback with minimal data
      return {
        ip: 'Unknown',
        country: 'Unknown',
        countryCode: 'XX',
        region: '',
        regionName: '',
        city: '',
        zip: '',
        lat: 0,
        lon: 0,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        isp: 'Unknown',
        org: 'Unknown',
        as: '',
        mobile: false,
        proxy: false,
        hosting: false
      }
    } catch (error) {
      console.error('Error fetching IP details:', error)
      return null
    }
  }

  private async fetchFromIPify(): Promise<IPDetails | null> {
    try {
      // Get IP first
      const ipResponse = await fetch('https://api.ipify.org?format=json')
      const ipData = await ipResponse.json()

      // Get location data
      const locationResponse = await fetch(`https://ipapi.co/${ipData.ip}/json/`)
      const data = await locationResponse.json()

      if (data.ip) {
        return {
          ip: data.ip,
          country: data.country_name || 'Unknown',
          countryCode: data.country_code || 'XX',
          region: data.region_code || '',
          regionName: data.region || '',
          city: data.city || '',
          zip: data.postal || '',
          lat: parseFloat(data.latitude) || 0,
          lon: parseFloat(data.longitude) || 0,
          timezone: data.timezone || 'UTC',
          isp: data.org || 'Unknown',
          org: data.org || 'Unknown',
          as: data.asn || '',
          mobile: false,
          proxy: false,
          hosting: false
        }
      }
    } catch (error) {
      console.warn('IPify API failed:', error)
    }
    return null
  }

  private async fetchFromFreeGeoIP(): Promise<IPDetails | null> {
    try {
      const response = await fetch('https://freegeoip.app/json/')
      const data = await response.json()

      if (data.ip) {
        return {
          ip: data.ip,
          country: data.country_name || 'Unknown',
          countryCode: data.country_code || 'XX',
          region: data.region_code || '',
          regionName: data.region_name || '',
          city: data.city || '',
          zip: data.zip_code || '',
          lat: parseFloat(data.latitude) || 0,
          lon: parseFloat(data.longitude) || 0,
          timezone: data.time_zone || 'UTC',
          isp: 'Unknown',
          org: 'Unknown',
          as: '',
          mobile: false,
          proxy: false,
          hosting: false
        }
      }
    } catch (error) {
      console.warn('FreeGeoIP API failed:', error)
    }
    return null
  }

  private async fetchFromIPAPI(): Promise<IPDetails | null> {
    try {
      const response = await fetch('https://ipapi.co/json/')
      const data = await response.json()

      if (data.ip) {
        return {
          ip: data.ip,
          country: data.country_name || 'Unknown',
          countryCode: data.country_code || 'XX',
          region: data.region_code || '',
          regionName: data.region || '',
          city: data.city || '',
          zip: data.postal || '',
          lat: parseFloat(data.latitude) || 0,
          lon: parseFloat(data.longitude) || 0,
          timezone: data.timezone || 'UTC',
          isp: data.org || 'Unknown',
          org: data.org || 'Unknown',
          as: data.asn || '',
          mobile: false,
          proxy: false,
          hosting: false
        }
      }
    } catch (error) {
      console.warn('IPAPI failed:', error)
    }
    return null
  }

  getDeviceInfo(): DeviceInfo {
    if (typeof window === 'undefined') {
      return {
        userAgent: '',
        platform: '',
        language: '',
        languages: [],
        screen: { width: 0, height: 0, colorDepth: 0 },
        timezone: '',
        cookieEnabled: false,
        onLine: false
      }
    }

    const nav = window.navigator as any

    return {
      userAgent: nav.userAgent || '',
      platform: nav.platform || '',
      language: nav.language || '',
      languages: nav.languages || [],
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookieEnabled: nav.cookieEnabled,
      onLine: nav.onLine,
      deviceMemory: nav.deviceMemory,
      hardwareConcurrency: nav.hardwareConcurrency,
      connection: nav.connection ? {
        effectiveType: nav.connection.effectiveType,
        downlink: nav.connection.downlink,
        rtt: nav.connection.rtt
      } : undefined
    }
  }

  generateSessionToken(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }

    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }
}

export default IPService
export type { IPDetails, DeviceInfo }