import { describe, expect, it } from 'vitest'
import { COUNTRIES, allCities, cityPart, countriesByPriority, countryOfCity, resolveCity } from './locations'

describe('locations taxonomy', () => {
  it('has unique country codes/ids/priorities and non-empty cities', () => {
    const codes = COUNTRIES.map(c => c.code)
    const ids = COUNTRIES.map(c => c.id)
    const prios = COUNTRIES.map(c => c.priority)
    expect(new Set(codes).size).toBe(codes.length)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(prios).size).toBe(prios.length)
    for (const c of COUNTRIES) {
      expect(c.cities.length).toBeGreaterThan(0)
      expect(c.label).toBeTruthy()
      expect(c.en).toBeTruthy()
    }
  })

  it('has globally-unique city ids', () => {
    const ids = COUNTRIES.flatMap(c => c.cities.map(city => city.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('resolves free-string cities (ar/en/slug) to city + country', () => {
    expect(resolveCity('الرياض')?.country.id).toBe('saudi')
    expect(resolveCity('Riyadh')?.country.id).toBe('saudi')
    expect(resolveCity('riyadh')?.city.label).toBe('الرياض')
    expect(resolveCity('دبي')?.country.id).toBe('uae')
    expect(resolveCity('  جدة  ')?.city.id).toBe('jeddah')
  })

  it('does not treat non-cities as locations', () => {
    expect(resolveCity('عن بُعد')).toBeUndefined()
    expect(resolveCity('remote')).toBeUndefined()
    expect(resolveCity('')).toBeUndefined()
    expect(resolveCity(undefined)).toBeUndefined()
  })

  it('maps a city to its country slug', () => {
    expect(countryOfCity('الخبر')).toBe('saudi')
    expect(countryOfCity('القاهرة')).toBe('egypt')
    expect(countryOfCity('عن بُعد')).toBeUndefined()
  })

  it('orders countries and cities by priority (home market first)', () => {
    expect(countriesByPriority()[0].id).toBe('saudi')
    expect(allCities()[0].city.id).toBe('riyadh')
  })

  it('extracts the city from a compound display location', () => {
    expect(cityPart('الرياض · حضوري وعن بُعد')).toBe('الرياض')
    expect(cityPart('الدمام · عن بُعد')).toBe('الدمام')
    expect(cityPart('جدة')).toBe('جدة')
    expect(cityPart(undefined)).toBeUndefined()
    // يُحلّ الجزء المُستخرَج إلى قطاع مكانيّ فعليّ
    expect(resolveCity(cityPart('الرياض · حضوري'))?.country.id).toBe('saudi')
  })

  it('covers every seed city used across markets', () => {
    // المدن الحاضرة في البذور يجب أن تُحلّ كلها (لا تسقط من محور المكان)
    const seedCities = ['الرياض', 'جدة', 'الدمام', 'الخبر', 'الظهران', 'مكة المكرمة']
    for (const c of seedCities)
      expect(resolveCity(c), c).toBeDefined()
  })
})
