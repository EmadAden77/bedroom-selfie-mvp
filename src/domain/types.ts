
export type IdentityCore = {
  id: string
  arabicLabel: string
  englishName: string
  userFacingMeaning: string
  renderableFragment: string
}

export type HairIdentityGuard = {
  id: string
  fragment: string
}

export type HairVariant = {
  id: string
  arabicLabel: string
  englishName: string
  userFacingMeaning: string
  observableConfig: string
  renderableFragment: string
  isDefault?: boolean
}

export type FacialIdentityGuard = {
  id: string
  fragment: string
}

export type ExpressionVariant = {
  id: string
  arabicLabel: string
  englishName: string
  userFacingMeaning: string
  observableFacialConfiguration: string
  renderableFragment: string
  isDefault?: boolean
}

export type DeferredCompositeState = ExpressionVariant & {
  deferred: true
  isSelectable: false
  reason: string
}

export type MaterialProfile = {
  id: string
  arabicLabel: string
  englishName: string
  userFacingMeaning: string
  renderableBehavior: string
}

export type FitProfile = {
  id: string
  arabicLabel: string
  englishName: string
  userFacingMeaning: string
  renderableFragment: string
}

export type GarmentState = {
  id: string
  arabicLabel: string
  englishName: string
  userFacingMeaning: string
  renderableFragment: string
}

export type GarmentRecord = {
  id: string
  arabicLabel: string
  englishName: string
  userFacingMeaning: string
  category: 'upper' | 'lower'
  defaultMaterial: string
  defaultFit: string
  defaultState: string
  defaultColor: string
  defaultSurface: string
  allowedMaterials: string[]
  allowedFits: string[]
  allowedStates: string[]
  allowedColors: string[]
  allowedSurfaces: string[]
  isReferencePreservation?: boolean
  isDefaultUpper?: boolean
  renderableFragmentExact?: string
  compatibleMaterials: string[]
}

export type ReferenceImageMeta = {
  fileName: string
  mimeType: string
  sizeBytes: number
  sizeKB: string
  width: number | null
  height: number | null
  sha256: string
  objectUrl: string
}

import type {RoomPhysicalState} from '../data/room-physical-state'
import type {BeddingSelection} from '../../shared/bedding-physics'
import type {LightingOption} from '../../shared/lighting-decision'

export type CompilationContext = {
  hairVariantId: string
  hairstyleMode?: 'preserve' | 'apply'
  hairDirection?: 'auto' | 'back' | 'forward' | 'left' | 'right'
  hairVolume?: 'auto' | 'flat' | 'natural' | 'lifted'
  hairTexture?: 'auto' | 'tidy' | 'soft' | 'messy'
  promptTarget?: 'gemini' | 'chatgpt' | 'flux' | 'midjourney'
  realismIntensity?: 'natural' | 'candid' | 'raw'
  expressionVariantId: string
  gazeId?: 'auto' | 'lens' | 'screen' | 'off_left' | 'off_right' | 'down'
  microExpressionId?: 'none' | 'wink_left' | 'wink_right' | 'brow_raise' | 'micro_smile'
  upperGarmentId: string
  lowerGarmentId: string | null
  materialId: string
  fitId: string
  stateId: string
  color: string
  surface: string
  referenceImagePresent: boolean
  roomReferencePresent?: boolean
  bedroomClutterId?: 'reference' | 'lived_in_messy'
  roomPhysicalState?:RoomPhysicalState
  // PR7b: explicit user-declared room size. Missing legacy options mean
  // the visible medium preset is assumed, NOT confirmed.
  roomSizePreset?:'small_bedroom'|'medium_bedroom'|'large_bedroom'|'custom'
  roomSizeConfirmed?:boolean
  roomCustomWidthMeters?:number|null
  roomCustomDepthMeters?:number|null
  roomCustomHeightMeters?:number|null
  beddingSelection?:BeddingSelection
  nightLightingId?: LightingOption
  windowUncovered?: boolean
  bodyHoldingHand?: 'auto' | 'left' | 'right' | 'none'
  bodySupportChoice?: 'auto' | 'floor' | 'mattress' | 'none' | 'unknown'
  bodyFreeHandTask?: 'auto' | 'free' | 'surface_support' | 'phone'
  bodyFeetVisibility?: 'visible' | 'occluded' | 'outside_crop' | 'unknown' | 'absent'
  poseId?: string
  faceDirectionId?: string
  bedroomShotId?: string
  mirrorMovementId?: string
  mirrorPhoneHeightId?: string
  mirrorDistanceId?: string
  mirrorFramingId?: string
  mirrorGazeId?: string
  lowerMaterialId?: string
  lowerFitId?: string
  lowerStateId?: string
  lowerColor?: string
  lowerSurface?: string
}

export type PromptSection = {
  id: string
  content: string
}

export type CompilationResult = {
  promptText: string
  sections: PromptSection[]
  completedModules: string[]
  pendingModules: string[]
  errors: string[]
  warnings: string[]
}

export type ValidationResult = {
  isValid: boolean
  errors: string[]
  warnings: string[]
}
