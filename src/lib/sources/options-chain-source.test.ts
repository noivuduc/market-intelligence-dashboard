import { afterEach, describe, expect, it } from 'vitest'
import {
  pickOptionsChainProvider,
  resolveOptionsChainSourceMode,
} from './options-chain-source'

const origSource = process.env.OPTIONS_CHAIN_SOURCE

afterEach(() => {
  if (origSource === undefined) delete process.env.OPTIONS_CHAIN_SOURCE
  else process.env.OPTIONS_CHAIN_SOURCE = origSource
})

describe('resolveOptionsChainSourceMode', () => {
  it('defaults to yahoo when unset', () => {
    delete process.env.OPTIONS_CHAIN_SOURCE
    expect(resolveOptionsChainSourceMode()).toBe('yahoo')
  })

  it('treats yfinance and yfin as yahoo', () => {
    process.env.OPTIONS_CHAIN_SOURCE = 'yfinance'
    expect(resolveOptionsChainSourceMode()).toBe('yahoo')
    process.env.OPTIONS_CHAIN_SOURCE = 'YFIN'
    expect(resolveOptionsChainSourceMode()).toBe('yahoo')
  })
})

describe('pickOptionsChainProvider', () => {
  it('auto prefers polygon when key present', () => {
    expect(pickOptionsChainProvider('auto', true, true)).toBe('polygon')
  })

  it('auto falls back to yahoo without polygon key', () => {
    expect(pickOptionsChainProvider('auto', false, true)).toBe('yahoo')
  })

  it('yahoo forces yahoo when market enabled', () => {
    expect(pickOptionsChainProvider('yahoo', true, true)).toBe('yahoo')
  })

  it('polygon requires key', () => {
    expect(pickOptionsChainProvider('polygon', false, true)).toBe(null)
  })
})
