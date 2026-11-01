import type {CompilationContext} from '../domain/types'

export type RoomOrder='reference'|'light'|'medium'|'clear'
export type RoomSurface='reference'|'touch'|'dust'
export type RoomZone='bed'|'floor'|'dresser'|'nightstand'
export type RoomPhysicalState={
 order:RoomOrder
 surface:RoomSurface
 zones:RoomZone[]
 sessionLocked:boolean
}
export type RoomObject={id:string;zone:RoomZone;label:string;placement:string}

export const ROOM_ZONES:readonly RoomZone[]=['bed','floor','dresser','nightstand']
export const DEFAULT_ROOM_PHYSICAL_STATE:RoomPhysicalState={
 order:'clear',surface:'dust',zones:['bed','floor','dresser','nightstand'],sessionLocked:true
}

/** Fixed item IDs and anchors: no randomness, no capture-mode-dependent relocation. */
const ANCHORS:readonly RoomObject[]=[
 {id:'bed_duvet_01',zone:'bed',label:'لحاف مستخدم',placement:'The original duvet has asymmetrical gravity-supported folds on the existing mattress. Do not change its pattern, size and original pillow count.'},
 {id:'bed_garment_01',zone:'bed',label:'قطعة ملابس على السرير',placement:'One small casual garment rests on a clear corner of the mattress, supported by bedding; its position is fixed until touched.'},
 {id:'floor_shoes_01',zone:'floor',label:'حذاء أو شبشب مرجعي',placement:'Keep the reference footwear on the original tile patch with both soles grounded; their small asymmetry is stable across views.'},
 {id:'floor_cloth_01',zone:'floor',label:'قميص صغير على الأرض',placement:'One loose shirt lies on a free floor patch outside the walking aisle; its fabric touches tile continuously without clipping the rug.'},
 {id:'dresser_items_01',zone:'dresser',label:'أغراض التسريحة',placement:'Keep a few existing small dresser objects slightly unaligned, fully supported and clear of the separate vanity mirror. Never invent drawers.'},
 {id:'dresser_fold_01',zone:'dresser',label:'قطعة قماش على التسريحة',placement:'A small garment is partly folded on free dresser surface, with one natural fabric edge; preserve the existing wardrobe-door tracks.'},
 {id:'nightstand_cable_01',zone:'nightstand',label:'سلك الشحن',placement:'The existing charging cable forms a short continuous loose curve on the nightstand; show a plugged connection only if its real real endpoint is visible.'},
 {id:'nightstand_small_01',zone:'nightstand',label:'غرض صغير على الكومود',placement:'One small everyday item rests flat on available nightstand surface, respecting existing reference belongings and real clearance.'}
]
const ORDER_COUNT:Record<RoomOrder,number>={reference:0,light:1,medium:1,clear:2}

/** One observable anchor per enabled zone at medium, two at clear. */
export function selectedRoomObjects(state:RoomPhysicalState):RoomObject[]{
 const count=ORDER_COUNT[state.order]
 return ROOM_ZONES.filter(zone=>state.zones.includes(zone))
  .flatMap(zone=>ANCHORS.filter(o=>o.zone===zone).slice(0,count))
}
export function validateRoomPhysicalState(state:RoomPhysicalState):string[]{
 const issues:string[]=[]
 if(!['reference','light','medium','clear'].includes(state.order))issues.push('Invalid room order')
 if(!['reference','touch','dust'].includes(state.surface))issues.push('Invalid room surface')
 if(!Array.isArray(state.zones)||state.zones.some(zone=>!ROOM_ZONES.includes(zone))||new Set(state.zones).size!==state.zones.length)
  issues.push('Invalid editable room zones')
 if(typeof state.sessionLocked!=='boolean')issues.push('Invalid room session lock')
 return issues
}
export function renderRoomPhysicalState(ctx:CompilationContext,compact=false):string{
 const state=ctx.roomPhysicalState
 if(!state)return ''
 const items=selectedRoomObjects(state)
 const material='Keep wall and skirting junctions straight; original painted-wall microtexture remains visible only under real grazing light. Keep the exact reference ceramic tile grid, grout alignment, finish and floor-to-rug edge; glossy tiles reflect actual fixtures with material-appropriate roughness. The wardrobe mirror and the separate dresser mirror use the SAME anchored room objects, equal-angle specular paths and honest crop/occlusion. Preserve furniture positions, original wear and real source lighting.'
 const surface=state.surface==='dust'
  ? 'LIMITED DUST: a faint localized deposit only at existing skirting corners and beneath accessible furniture, visible solely when the chosen camera and light reveal it. No dirt film, scratches, mould, stains, damage and mirror fogging.'
  :state.surface==='touch'
  ? 'TOUCH TRACES: restrained removable finger-contact traces only on plausible touched surfaces and only if visible; no invented permanent scratches, stains and damaged paint.'
  :'SURFACE CONDITION: use only marks actually present in the room reference; invent no grime, new wear and scratches.'
 const mode=state.order==='reference'
  ? 'ROOM ORDER: strictly match the reference; add no objects and no rearrangement.'
  :'ROOM ORDER: '+(state.order==='clear'?'visibly lived-in with several anchored loose items':'subtly used with few anchored loose items')+'. Changes are restricted to selected editable zones, do not replace original objects and avoid cluttering the clear walking aisle.'
 const persistence=state.sessionLocked
  ? 'SESSION CONTINUITY: all anchored object IDs, positions, orientations and contacts persist across subsequent camera angles; only direct touches may alter local contact folds. Never reshuffle items due to viewpoint changes.'
  :'SESSION CONTINUITY: small movable items may be repositioned only by an explicit subsequent scene change; never relocate fixed furniture.'
 return [
  compact?'PHYSICAL ROOM STATE:':'PHYSICAL ROOM STATE — REFERENCE-FIRST:',
  material,mode,surface,persistence,
  items.length?'SELECTED STABLE OBJECT ANCHORS: '+items.map(o=>o.id+' ['+o.zone+']: '+o.placement).join(' '):'SELECTED STABLE OBJECT ANCHORS: none.',
  'CHECK: each object has real support and valid contact shadows; no cable through furniture, duplicated reflected objects, floating shoes, retiling, altered grout lines and unselected light. Physical body and bedding compression follows actual weight only.',
  ctx.roomReferencePresent?'Room photo is authoritative for existing surfaces, furniture and belongings; new selected movable items must fit available free space.':'No room photo is available to this prompt writer; use the selected zones and existing room plan only, without asserting unseen damage and exact dimensions.'
 ].join(compact?' ':'\n')
}
