import {it,expect} from 'vitest'
import {makeAuditCorrection} from '../features/photo-result-audit/correction'
import {bedroomShots} from '../data/bedroom-shots'
it('creates selective corrections',()=>{const s=makeAuditCorrection({bedroomShotId:'pillow_stack'} as any,{room:'fail',pose:'fail',identity:'pass'},'bed');expect(s).toContain('BED GEOMETRY');expect(s).toContain('KEEP VERIFIED DETAILS: identity')})
it('anchors pillow pose',()=>{expect(bedroomShots.find(x=>x.id==='pillow_stack')?.description).toContain('Pelvis and lower back')})
