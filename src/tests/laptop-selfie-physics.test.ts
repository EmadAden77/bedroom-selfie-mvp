import {describe,it,expect} from 'vitest'
import {bedroomShots,getShotPosture} from '../data/bedroom-shots'
import {poseInteractionRules} from '../data/pose-interaction'
import {isLaptopSelfieShot,nextLaptopLighting,renderLaptopSelfiePhysics,buildLaptopGeminiBrief} from '../data/laptop-selfie-physics'
import {buildCreativeSceneBrief} from '../features/ai-prompt-enhancer/buildCreativeSceneBrief'
import {compilePrompt} from '../compiler'
import type {CompilationContext} from '../domain/types'

const base:CompilationContext={
 hairVariantId:'reference_natural_dry',
 expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',
 fitId:'regular',stateId:'observed_natural_state',
 color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',
 referenceImagePresent:true,roomReferencePresent:true,bedroomClutterId:'reference',
 nightLightingId:'led_spotlight' as const,poseId:'seated_bed'
}
const laptopShots=bedroomShots.filter(shot=>isLaptopSelfieShot(shot.id))
describe('Laptop selfie physical poses and light integration',()=>{
 it('offers 14 stable distinct laptop selfies in their own selectable category',()=>{
  expect(laptopShots).toHaveLength(14)
  expect(laptopShots.every(x=>x.category===4)).toBe(true)
  expect(laptopShots.filter(x=>x.mode==='front')).toHaveLength(12)
  expect(laptopShots.filter(x=>x.mode==='timer')).toHaveLength(2)
  expect(new Set(laptopShots.map(x=>x.id)).size).toBe(14)
  expect(isLaptopSelfieShot('laptop_reflection')).toBe(false)
 })
 it.each(laptopShots)('$id has anatomical support and valid final local composition',shot=>{
  const ctx:CompilationContext={...base,bedroomShotId:shot.id,poseId:getShotPosture(shot.id) as string}
  const {validation,result}=compilePrompt(ctx)
  expect(validation.isValid).toBe(true)
  expect(result.errors).toHaveLength(0)
  expect(result.sections.filter(x=>x.id==='laptop_selfie_physics')).toHaveLength(1)
  expect(result.sections.find(x=>x.id==='laptop_selfie_physics')?.content).toContain('LAPTOP SELFIE PHYSICS:')
  expect(result.sections.find(x=>x.id==='laptop_selfie_physics')?.content).toContain('hinged screen')
  expect(result.sections.find(x=>x.id==='body_pose_physics')?.content).toContain(shot.mode==='timer'?'Timer shot:':'Handheld capture:')
  expect(poseInteractionRules[shot.id]).toBeTruthy()
  expect(getShotPosture(shot.id)).toBeTruthy()
  if(shot.mode==='timer'){
   expect(result.sections.find(x=>x.id==='camera_physics')?.content).toContain('TIMER CAPTURE:')
   expect(result.sections.find(x=>x.id==='laptop_selfie_physics')?.content).toContain('TIMER HANDS:')
  }else{
   expect(result.sections.find(x=>x.id==='camera_physics')?.content).toContain('FRONT SELFIE CAPTURE:')
   expect(result.sections.find(x=>x.id==='laptop_selfie_physics')?.content).toContain('HANDHELD SELFIE HANDS:')
  }
 })
 it('renders screen illumination only when explicitly chosen',()=>{
  const bedroomShotId='laptop_reclined_reading'
  const laptop=compilePrompt({...base,bedroomShotId,nightLightingId:'laptop_screen' as const})
  expect(laptop.validation.isValid).toBe(true)
  expect(laptop.result.sections.find(x=>x.id==='laptop_selfie_physics')?.content).toContain('LAPTOP DISPLAY ILLUMINATION:')
  expect(laptop.result.promptText).toContain('a glowing laptop screen')
  const phone=compilePrompt({...base,bedroomShotId,nightLightingId:'phone_screen' as const})
  expect(phone.validation.isValid).toBe(true)
  expect(phone.result.sections.find(x=>x.id==='laptop_selfie_physics')?.content).toContain('PHONE DISPLAY ILLUMINATION:')
  expect(phone.result.sections.find(x=>x.id==='laptop_selfie_physics')?.content).toContain('laptop display stays dark')
  const room=compilePrompt({...base,bedroomShotId,nightLightingId:'led_spotlight' as const})
  expect(room.validation.isValid).toBe(true)
  expect(room.result.sections.find(x=>x.id==='laptop_selfie_physics')?.content).toContain('HOUSEHOLD LIGHTING:')
  expect(room.result.sections.find(x=>x.id==='laptop_selfie_physics')?.content).not.toContain('LAPTOP DISPLAY ILLUMINATION:')
 })
 it('auto-selects meaningful laptop display lighting on entering laptop pose and restores light on exit',()=>{
  expect(nextLaptopLighting('laptop_edge_trackpad','phone_screen')).toBe('phone_screen')
  expect(nextLaptopLighting('laptop_edge_trackpad','led_spotlight')).toBe('led_spotlight')
  expect(nextLaptopLighting('laptop_tilt_screen','laptop_screen')).toBe('laptop_screen')
  expect(nextLaptopLighting('bed_edge','laptop_screen')).toBe('laptop_screen')
  expect(nextLaptopLighting('mirror_wardrobe','laptop_screen')).toBe('laptop_screen')
  expect(nextLaptopLighting('mirror_rear_flash','camera_flash')).toBe('camera_flash')
 })
 it('sends a laptop-specific coherent Gemini brief for the selected action, no other shot',()=>{
  const ctx={...base,bedroomShotId:'laptop_high_angle_keyboard',nightLightingId:'laptop_screen' as const}
  const brief=buildCreativeSceneBrief(ctx)
  expect(brief).toContain('SELECTED LAPTOP SELFIE:')
  expect(brief).toContain('partial face')
  expect(brief).toContain('the real physical object interacting with the person')
  expect(brief).toContain('sole physical light source')
  expect(brief).toContain('Exactly one hand is occupied')
  expect(brief).toContain('Gemini does not receive')
  expect(brief.length).toBeLessThan(6500)
  expect(buildLaptopGeminiBrief({...base,bedroomShotId:'mirror_wardrobe'})).toBe('')
  expect(renderLaptopSelfiePhysics({...base,bedroomShotId:'bed_edge'})).toBe('')
  expect(compilePrompt({...base,bedroomShotId:'bed_edge'}).result.sections.some(s=>s.id==='laptop_selfie_physics')).toBe(false)
 })
 it('timer laptop pose never claims handheld phone or additional arms',()=>{
  const c=compilePrompt({...base,bedroomShotId:'laptop_dresser_typing_timer',poseId:'standing',nightLightingId:'laptop_screen' as const})
  expect(c.validation.isValid).toBe(true)
  const text=c.result.promptText
  expect(text).toContain('TIMER CAPTURE:')
  expect(text).not.toContain('FRONT SELFIE CAPTURE:')
  expect(text).toContain('Both hands type')
  expect(text).toContain('phone is placed')
 })
})
