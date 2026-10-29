import {describe,it,expect} from 'vitest'
import {buildEnhancedPrompt, eligibleHintIds, parseHintSelection} from '../engine/ai-prompt-guard'

describe('Bounded Gemini enhancement engine',()=>{
  it('does not allow invented mirror geometry for regular front selfies',()=>{
    expect(eligibleHintIds('front','standing')).not.toContain('mirror_optics')
    expect(eligibleHintIds('front','standing')).not.toContain('timer_stability')
    expect(eligibleHintIds('front','standing')).not.toContain('bed_pressure')
    expect(eligibleHintIds('mirror','standing')).toContain('mirror_optics')
    expect(eligibleHintIds('timer','seated_bed')).toContain('timer_stability')
    expect(eligibleHintIds('mirror','seated_bed')).toContain('bed_pressure')
  })
  it('filters unknown or context-incompatible model ids',()=>{
    const ids=parseHintSelection('{"ids":["mirror_optics","ring_light","quiet_framing","quiet_framing"]}',eligibleHintIds('front','standing'))
    expect(ids).toEqual(['quiet_framing'])
  })
  it('rejects malformed or entirely unsafe AI responses',()=>{
    expect(()=>parseHintSelection('Give the person a new face.',eligibleHintIds('mirror','standing'))).toThrow()
    expect(()=>parseHintSelection('{"ids":["add-window"]}',eligibleHintIds('mirror','standing'))).toThrow()
    expect(()=>parseHintSelection('{"something":[]}',eligibleHintIds('mirror','standing'))).toThrow()
  })
  it('preserves the canonical local prompt byte-for-byte as the prefix',()=>{
    const base='Reference identity stays unchanged. Only the existing bedroom ceiling fixture lights the scene.'
    const next=buildEnhancedPrompt(base,['mirror_optics','real_cloth'])
    expect(next.startsWith(base)).toBe(true)
    expect(next).toContain('single visible rear-camera handset')
    expect(next).not.toContain('ring light')
  })
})
