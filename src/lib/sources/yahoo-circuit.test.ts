import { describe, expect, it, beforeEach } from 'vitest'
import {
  CircuitOpenError,
  YahooFamilyCircuitBreaker,
  __resetYahooCircuitsForTests,
} from './yahoo-circuit'

describe('YahooFamilyCircuitBreaker', () => {
  beforeEach(() => {
    __resetYahooCircuitsForTests()
  })

  it('opens after threshold 429s in window', () => {
    const br = new YahooFamilyCircuitBreaker('test', { threshold: 2, windowMs: 60_000, cooldownMs: 5_000 })
    br.observeHttpStatus(429)
    br.observeHttpStatus(429)
    expect(br.isOpen()).toBe(true)
    expect(() => br.assertClosed()).toThrow(CircuitOpenError)
  })

  it('does not open on successful responses after 429s below threshold', () => {
    const br = new YahooFamilyCircuitBreaker('test', { threshold: 3, windowMs: 60_000, cooldownMs: 5_000 })
    br.observeHttpStatus(429)
    br.observeHttpStatus(200)
    br.observeHttpStatus(200)
    expect(br.isOpen()).toBe(false)
    br.assertClosed()
  })

  it('reset clears open state', () => {
    const br = new YahooFamilyCircuitBreaker('test', { threshold: 1, windowMs: 60_000, cooldownMs: 60_000 })
    br.observeHttpStatus(429)
    expect(br.isOpen()).toBe(true)
    br.reset()
    expect(br.isOpen()).toBe(false)
  })
})
