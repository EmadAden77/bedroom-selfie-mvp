import {describe,it,expect} from 'vitest'
import {compareTargets,isCopyable} from '../features/prompt-comparison/compare'
import {bedroomShots} from '../data/bedroom-shots'
import type {CompilationContext} from '../domain/types'

const base:CompilationContext={
 hairVariantId:'neatly_combed',hairstyleMode:'apply',expressionVariantId:'neutral_relaxed',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',stateId:'observed_natural_state',
 color:'apparent dark charcoal-gray as observed',surface:'apparent knit-like surface character',referenceImagePresent:true
}
describe('Gemini vs ChatGPT comparison',()=>{
 it('compiles both targets without mutating the selected target',()=>{
   const context={...base,promptTarget:'chatgpt' as const}
   const result=compareTargets(context)
   expect(context.promptTarget).toBe('chatgpt')
   expect(result.gemini.validation.isValid).toBe(true)
   expect(result.chatgpt.validation.isValid).toBe(true)
   expect(isCopyable(result.gemini)).toBe(true)
   expect(isCopyable(result.chatgpt)).toBe(true)
   expect(result.gemini.result.promptText).not.toBe(result.chatgpt.result.promptText)
   expect(result.differences.some(d=>d.id==='chatgpt_hairstyle_priority')).toBe(true)
   expect(result.sharedCount).toBeGreaterThan(10)
 })
 it('blocks copy from both panels for invalid shared settings',()=>{
   const result=compareTargets({...base,upperGarmentId:'invalid'})
   expect(isCopyable(result.gemini)).toBe(false)
   expect(isCopyable(result.chatgpt)).toBe(false)
 })
 it('retains original selected context without changing any other setting',()=>{
   const context={...base,hairDirection:'forward' as const,roomReferencePresent:true}
   const result=compareTargets(context)
   for(const output of [result.gemini,result.chatgpt]){
     expect(output.result.promptText).toContain('Bring existing front strands forward')
     expect(output.result.promptText).toContain('ROOM IMAGE REFERENCE:')
   }
 })
 it.each(bedroomShots.filter(s=>!['curtain_shadows','door_light_strip','silhouette','half_light'].includes(s.id)))('comparison works with shot $id',shot=>{
   const lighting=shot.id==='mirror_rear_flash'?'camera_flash':shot.id==='half_light'||shot.id==='silhouette'?'led_spotlight':shot.id==='curtain_shadows'?'led_spotlight':'led_spotlight'
   const result=compareTargets({...base,bedroomShotId:shot.id,nightLightingId:lighting,windowUncovered:false})
   expect(result.gemini.validation.isValid).toBe(true)
   expect(result.chatgpt.validation.isValid).toBe(true)
   expect(isCopyable(result.gemini)).toBe(true)
   expect(isCopyable(result.chatgpt)).toBe(true)
 })
})
