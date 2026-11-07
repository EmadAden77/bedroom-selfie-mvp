import type {BodyMechanicalState,BodyStatus,BodyCertainty,BodyVisibility} from './body-mechanics.ts'

/** Reference-first bedding choices. "reference" means not visually verified by this text engine. */
export type BeddingSelection={
 sheet:'reference'|'confirmed'|'absent'
 pillow:'reference'|'confirmed'|'absent'
 blanket:'reference'|'spread_on_bed'|'touching_body'|'absent'
}
export const DEFAULT_BEDDING_SELECTION:BeddingSelection={
 sheet:'reference',pillow:'reference',blanket:'reference'
}
export type BeddingObjectId='bed.frame'|'bed.mattress'|'bed.pillow'|'bed.sheet'|'bed.blanket'
export type BeddingObject={
 id:BeddingObjectId;presence:'confirmed'|'unknown'|'absent'
 anchor:'reference_bed'|'supported_by_mattress'|'reference_unknown'
 visibility:BodyVisibility
}
export type BeddingContact={
 actorId:string;targetId:string;kind:'support'|'pressure'|'touch'|'drape'
 certainty:BodyCertainty;cause:string;sourceContact:string
}
export type BeddingResponse={
 targetId:BeddingObjectId;region:string;degree:'none'|'slight'|'moderate'
 effect:'compression'|'folds'|'tension'|'drape'
 certainty:BodyCertainty;cause:string
}
export type BeddingIssue={code:string;messageAr:string;controls:string[]}
export type BeddingState={
 status:BodyStatus
 selection:BeddingSelection
 objects:BeddingObject[]
 contacts:BeddingContact[]
 responses:BeddingResponse[]
 issues:BeddingIssue[]
 unknowns:string[]
}
const validSheet=['reference','confirmed','absent']
const validPillow=['reference','confirmed','absent']
const validBlanket=['reference','spread_on_bed','touching_body','absent']
const pillowShotContacts=new Set([
 'pillow_stack','reading_book','cheek_pillow','side_knee_tucked',
 'side_head_at_pillow_corner','laptop_side_bed_open','pillow_adjust_behind_back',
 'reclined_slide_down','laptop_reclined_reading','laptop_recline_chest',
 'upside_bed_edge','supine_high_phone','side_pillow_under_arm','hug_pillow'
])
const blanketShotContacts=new Set(['blanket_half_face','blanket_cocoon','duvet_draw_below_knees'])
export function validBeddingSelection(value:unknown):value is BeddingSelection{
 if(!value||typeof value!=='object'||Array.isArray(value))return false
 const x=value as Record<string,unknown>
 return Object.keys(x).length===3&&validSheet.includes(String(x.sheet))&&
  validPillow.includes(String(x.pillow))&&validBlanket.includes(String(x.blanket))
}
/**
 * Pure derived graph: only established V2.1 contact can create a pressure
 * response. Reference presence is unknown until explicitly confirmed.
 */
export function evaluateBedding(body:BodyMechanicalState,selected:BeddingSelection=DEFAULT_BEDDING_SELECTION):BeddingState{
 if(!validBeddingSelection(selected))throw Error('BEDDING_INPUT_INVALID')
 const selection={...selected}
 const issues:BeddingIssue[]=[]
 const unknowns:string[]=[]
 const contacts:BeddingContact[]=[]
 const responses:BeddingResponse[]=[]
 const shot=body.input.shotId
 const has=(actor:string,target:string)=>body.contacts.some(c=>c.actorId===actor&&c.targetId===target)
 const mat=body.contacts.filter(c=>c.targetId==='bed.mattress'&&
  (c.contactType==='support'||c.contactType==='pressure'))
 const pillowContact=body.contacts.filter(c=>c.targetId==='bed.pillow')
 const explicitPillow=pillowShotContacts.has(shot)||pillowContact.length>0
 const explicitBlanket=blanketShotContacts.has(shot)
 const pillowPresent=selection.pillow==='confirmed'||explicitPillow
 const blanketPresent=selection.blanket==='spread_on_bed'||selection.blanket==='touching_body'||explicitBlanket
 const sheetPresent=selection.sheet==='confirmed'
 const issue=(code:string,messageAr:string,controls:string[])=>issues.push({code,messageAr,controls})
 if(explicitPillow&&selection.pillow==='absent')issue('BEDDING_PILLOW_ABSENT','الوضعية تتطلب وسادة ملامسة، لكنك حددت عدم وجودها.',['beddingPillow','bedroomShotId'])
 if(explicitBlanket&&selection.blanket==='absent')issue('BEDDING_BLANKET_ABSENT','الوضعية تتطلب بطانية ملامسة، لكنك حددت عدم وجودها.',['beddingBlanket','bedroomShotId'])
 if(shot==='blanket_cocoon'&&selection.blanket==='spread_on_bed')
  issue('BEDDING_COVERAGE_CONFLICT','وضعية الالتفاف بالبطانية تتطلب تماسها مع الجسم، وليس بقاؤها مفرودة فقط.',['beddingBlanket','bedroomShotId'])
 const add=(actorId:string,targetId:string,kind:BeddingContact['kind'],certainty:BodyCertainty,cause:string,sourceContact:string)=>{
  contacts.push({actorId,targetId,kind,certainty,cause,sourceContact})
 }
 const respond=(targetId:BeddingObjectId,region:string,degree:BeddingResponse['degree'],effect:BeddingResponse['effect'],certainty:BodyCertainty,cause:string)=>{
  responses.push({targetId,region,degree,effect,certainty,cause})
 }
 // Existing fixed support stack: frame supports mattress. Its geometry is never changed.
 add('bed.mattress','bed.frame','support','derived','established_bed_support','bed.mattress')
 for(const contact of mat){
  const region=contact.actorId==='subject.pelvis'?'pelvis':contact.actorId==='subject.torso'?'torso':
   contact.actorId==='subject.free_elbow'?'elbow':'other_contact'
  const degree=region==='pelvis'||region==='torso'?'moderate':'slight'
  add(contact.actorId,'bed.mattress',contact.contactType==='pressure'?'pressure':'support',contact.certainty,
   'v21_contact_'+region,contact.cause)
  respond('bed.mattress',region,degree,'compression',contact.certainty,'v21_contact_'+contact.cause)
 }
 // A confirmed sheet sits on the mattress; its localized fabric response requires
 // both actual load and confirmed fabric presence. No sheet is conjured by pose.
 if(sheetPresent){
  add('bed.sheet','bed.mattress','support','selected','confirmed_sheet_on_mattress','selected_sheet_presence')
  for(const contact of mat){
   const region=contact.actorId==='subject.pelvis'?'pelvis':
    contact.actorId==='subject.torso'?'torso':'localized_contact'
   add(contact.actorId,'bed.sheet','pressure','estimated','contact_through_existing_sheet',contact.cause)
   respond('bed.sheet',region,'slight','folds','estimated','supported_contact_'+contact.cause)
  }
 }else if(selection.sheet==='reference')unknowns.push('SHEET_PRESENCE_NOT_CONFIRMED')
 if(pillowPresent&&selection.pillow!=='absent'){
  add('bed.pillow','bed.mattress','support','estimated','existing_pillow_support','selected_or_shot_pillow')
  for(const p of pillowContact){
   add(p.actorId,'bed.pillow','pressure',p.certainty,'v21_pillow_contact',p.cause)
   respond('bed.pillow',p.actorId==='subject.free_forearm'?'forearm':
    p.actorId==='subject.free_hand'?'hand':'head_back','slight','compression',p.certainty,p.cause)
  }
  // A hugging hand has a grip, not an invented head contact.
  if(has('subject.free_hand','bed.pillow')&&!pillowContact.some(p=>p.actorId==='subject.free_hand')){
   add('subject.free_hand','bed.pillow','touch','derived','selected_pillow_hug','selected_pillow_hug')
   respond('bed.pillow','hand','slight','compression','derived','selected_pillow_hug')
  }
 }else if(selection.pillow==='reference')unknowns.push('PILLOW_PRESENCE_NOT_CONFIRMED')
 if(blanketPresent&&selection.blanket!=='absent'){
  if(selection.blanket==='spread_on_bed'){
   add('bed.blanket','bed.mattress','support','selected','selected_existing_blanket_spread','selected_spread')
   // A spread blanket never magically reaches the subject.
  }else if(selection.blanket==='touching_body'||explicitBlanket){
   add('bed.blanket','subject.body','drape',selection.blanket==='touching_body'?'selected':'derived','body_blanket_contact','selected_blanket_coverage')
   respond('bed.blanket','body_contact','slight','folds','estimated','confirmed_body_blanket_contact')
   if(mat.length>0){
    add('bed.blanket','bed.mattress','support','estimated','drape_reaches_supported_bed','selected_blanket_coverage')
   }
  }
 }else if(selection.blanket==='reference')unknowns.push('BLANKET_PRESENCE_AND_COVERAGE_UNKNOWN')
 if(body.status==='NEEDS_INFORMATION')unknowns.push('BODY_SUPPORT_UNCERTAIN')
 const objects:BeddingObject[]=[
  {id:'bed.frame',presence:'confirmed',anchor:'reference_bed',visibility:'unknown'},
  {id:'bed.mattress',presence:'confirmed',anchor:'reference_bed',visibility:'unknown'},
  {id:'bed.pillow',presence:pillowPresent?'confirmed':selection.pillow==='absent'?'absent':'unknown',anchor:'reference_unknown',visibility:'unknown'},
  {id:'bed.sheet',presence:sheetPresent?'confirmed':selection.sheet==='absent'?'absent':'unknown',anchor:'supported_by_mattress',visibility:'unknown'},
  {id:'bed.blanket',presence:blanketPresent?'confirmed':selection.blanket==='absent'?'absent':'unknown',anchor:'reference_unknown',visibility:'unknown'}
 ]
 const status:BodyStatus=issues.length||body.status==='INVALID'?'INVALID':body.status==='NEEDS_INFORMATION'?'NEEDS_INFORMATION':'VALID'
 return {status,selection,objects,contacts,responses,issues,unknowns}
}
export function renderBedding(state:BeddingState):string{
 const parts=['BEDDING PHYSICS V2.2 CONTRACT:','Preserve reference bed frame, mattress borders, existing textile identity, color, pattern and placement.']
 for(const r of state.responses){
  if(r.targetId==='bed.mattress')parts.push('Local mattress compression follows the established '+r.region+' support region.')
  if(r.targetId==='bed.pillow')parts.push('Existing pillow yields slightly at the established '+r.region+' contact.')
  if(r.targetId==='bed.sheet')parts.push('Confirmed sheet remains continuous across the actual '+r.region+' contact, with restrained local folds.')
  if(r.targetId==='bed.blanket')parts.push('Confirmed blanket follows the body contact with gravity-supported soft folds.')
 }
 if(state.responses.every(x=>x.targetId!=='bed.mattress'))parts.push('No independent mattress depression without established support.')
 if(state.contacts.some(x=>x.cause==='selected_existing_blanket_spread'))parts.push('Confirmed blanket stays spread on its selected mattress support.')
 parts.push('Unknown bedding presence stays unasserted. Invisible bedding is not treated as absent. No unselected pillows, displaced bed frame, invented material constants and detached cloth.')
 return parts.join(' ')
}
