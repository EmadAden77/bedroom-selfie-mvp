import {describe,expect,it} from 'vitest'
import {bedroomShots} from '../data/bedroom-shots'
import {nightLightingPresets} from '../data/night-lighting'
import {
 mirrorRearFlashNeedsSource,captureAllowsRearFlash,rearCaptureScreenOnlyConflict
} from '../../shared/capture-lighting-rules'

/**
 * Frozen pre-PR5 truth-table equivalence: only the *location* of each predicate
 * changes. No new policy is introduced and no existing error wording changes.
 */
describe('PR5 canonical capture/light rule relocation (behavior equivalence)',()=>{
 const shots=[undefined,...bedroomShots.map(x=>x.id)]
 const lights=nightLightingPresets.map(x=>x.id)
 const modes=[undefined,'front','mirror','rear','timer','unrecognized']
 it('CL-1: all shot/light combinations preserve the original mirror flash requirement',()=>{
  for(const shotId of shots){
   for(const lighting of lights){
    const before=shotId==='mirror_rear_flash'&&lighting!=='camera_flash'
    expect(mirrorRearFlashNeedsSource(shotId,lighting)).toBe(before)
   }
  }
 })
 it('CL-2: all capture modes preserve the exact rear LED eligibility condition',()=>{
  for(const mode of modes){
   const before=mode==='rear'||mode==='mirror'
   expect(captureAllowsRearFlash(mode)).toBe(before)
  }
 })
 it('CL-3: all capture/light combinations preserve the screen-only rear conflict',()=>{
  for(const mode of modes){
   for(const lighting of lights){
    const before=lighting==='phone_screen'&&mode==='rear'
    expect(rearCaptureScreenOnlyConflict(mode,lighting)).toBe(before)
   }
  }
 })
})
