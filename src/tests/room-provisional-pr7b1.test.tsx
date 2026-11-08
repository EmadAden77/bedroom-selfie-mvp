import React from 'react'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {AiPromptEnhancer} from '../features/ai-prompt-enhancer/AiPromptEnhancer'
import {RoomSizeSelector} from '../features/room-geometry/RoomSizeSelector'
import {compilePrompt} from '../compiler'
import {buildSceneSpecification} from '../features/ai-prompt-enhancer/scene-specification'
import {unverifiedRoomMeasurements} from '../../shared/room-acknowledgement'
import {assertAuthoritative} from '../../shared/authoritative-prompt'
import type {CompilationContext} from '../domain/types'
import authority from '../../api/authorize-final-prompt'

afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
const base:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:true,roomReferencePresent:true,
 bedroomShotId:'mirror_wardrobe',poseId:'standing',nightLightingId:'ceiling_neutral'
}
const makeScene=(patch:Partial<CompilationContext>={})=>{
 const ctx={...base,...patch}
 const {validation,result}=compilePrompt(ctx)
 expect(validation.isValid).toBe(true)
 expect(result.errors).toEqual([])
 const spec=buildSceneSpecification(ctx,result,validation)
 return {ctx,validation,result,spec}
}
const endpoint='https://bedroom-selfie-mvp.vercel.app/api/authorize-final-prompt'
const post=(value:unknown)=>new Request(endpoint,{
 method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)
})

describe('PR7b-1 provisional opt-in, strict physics, and server-issued audit',()=>{
 it('A: unconfirmed scene compiles and displays Provisional with exact missing banners; no ack → 403 ROOM_UNVERIFIED',async()=>{
  const {ctx,validation,result,spec}=makeScene()
  const names=unverifiedRoomMeasurements(spec.roomGeometry,spec.capture.posture)
  expect(names).toEqual([
   'Room size: preset not user-confirmed',
   'Pose footprint: unmeasured',
   'Mirror width: unmeasured',
   'Implicit distances: pending PR8'
  ])
  expect(result.promptText.length).toBeGreaterThan(100)
  expect(spec.roomGeometry.userConfirmed).toBe(false)
  expect(()=>assertAuthoritative(spec,{source:'local',prompt:result.promptText}))
   .toThrow('ROOM_UNVERIFIED')
  const response=await authority.fetch(post({
   sceneSpecification:spec,candidate:{source:'local',prompt:result.promptText}
  }))
  expect(response.status).toBe(403)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('ROOM_UNVERIFIED')
  const onPromptReady=vi.fn()
  render(<>
   <RoomSizeSelector ctx={ctx} posture="standing" activeLighting="ceiling_neutral" onChange={vi.fn()}/>
   <AiPromptEnhancer ctx={ctx} validation={validation} result={result} onReset={vi.fn()}
    onPromptReady={onPromptReady} onAdvisoryReady={vi.fn()}/>
  </>)
  expect(screen.getByText('Room size assumed as medium. Confirm for accuracy.')).toBeTruthy()
  expect(screen.getAllByText(/Pose footprint: unmeasured/).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/Mirror width: unmeasured/).length).toBeGreaterThan(0)
  fireEvent.click(screen.getByRole('button',{name:'عرض البرومبت المحلي (غير معتمد)'}))
  expect(screen.getByText('Provisional')).toBeTruthy()
  expect(screen.getByRole('button',{name:/Confirm and mark as authoritative/})).toBeTruthy()
  expect(onPromptReady).not.toHaveBeenCalledWith(result.promptText)
 })
 it('B: modal lists EVERY gap; one explicit confirmation yields 200 Authoritative and server audit actor/time',async()=>{
  const {ctx,validation,result,spec}=makeScene()
  const spy=vi.spyOn(console,'info').mockImplementation(()=>{})
  let auditResponse:any
  const fetcher=vi.fn(async(_url:string,options:RequestInit)=>{
   const request=new Request(endpoint,{
    method:'POST',headers:options.headers,body:options.body
   })
   const response=await authority.fetch(request)
   auditResponse={status:response.status,...await response.clone().json()}
   return response
  })
  vi.stubGlobal('fetch',fetcher)
  const onPromptReady=vi.fn()
  render(<AiPromptEnhancer ctx={ctx} validation={validation} result={result} onReset={vi.fn()}
   onPromptReady={onPromptReady} onAdvisoryReady={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'عرض البرومبت المحلي (غير معتمد)'}))
  fireEvent.click(screen.getByRole('button',{name:/Confirm and mark as authoritative/}))
  const modal=screen.getByRole('dialog',{name:'Confirm unverified room measurements'})
  expect(modal).toBeTruthy()
  expect(modal.textContent).toContain('Room size: preset not user-confirmed')
  expect(modal.textContent).toContain('Pose footprint: unmeasured')
  expect(modal.textContent).toContain('Mirror width: unmeasured')
  expect(modal.textContent).toContain('Implicit distances: pending PR8')
  expect(onPromptReady).not.toHaveBeenCalledWith(result.promptText)
  fireEvent.click(screen.getByRole('button',{name:'I acknowledge every unverified measurement and confirm'}))
  await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1))
  expect(auditResponse.status).toBe(200)
  await waitFor(()=>expect(onPromptReady).toHaveBeenCalledWith(result.promptText))
  expect(screen.getByText('Authoritative')).toBeTruthy()
  expect(auditResponse.validated).toBe(true)
  expect(auditResponse.audit.event).toBe('ROOM_MEASUREMENTS_ACKNOWLEDGED')
  expect(auditResponse.audit.actor).toBe('interactive_user_unverified')
  expect(auditResponse.audit.actorVerified).toBe(false)
  expect(Number.isFinite(Date.parse(auditResponse.audit.confirmedAt))).toBe(true)
  expect(auditResponse.audit.sceneIntegrity).toBe(spec.integrity)
  expect(auditResponse.audit.unverifiedMeasurements).toEqual(
   unverifiedRoomMeasurements(spec.roomGeometry,spec.capture.posture)
  )
  expect(spy).toHaveBeenCalledWith('ROOM_ACK_AUDIT',JSON.stringify(auditResponse.audit))
  const posted=JSON.parse((fetcher.mock.calls[0] as unknown as [string,RequestInit])[1].body as string)
  expect(posted.roomAcknowledgement).toEqual({
   accepted:true,sceneIntegrity:spec.integrity,
   measurements:auditResponse.audit.unverifiedMeasurements
  })
 })
 it('C: explicit confirmation CANNOT override RG invalid; both authority gate and server reject',async()=>{
  const {result,spec}=makeScene({roomSizePreset:'custom',roomCustomWidthMeters:2,
   roomCustomDepthMeters:2,roomCustomHeightMeters:2.6,nightLightingId:'phone_screen_only'})
  expect(spec.roomGeometry.bedFitValid.status).toBe('invalid')
  const measurementNames=unverifiedRoomMeasurements(spec.roomGeometry,spec.capture.posture)
  const ack={accepted:true,sceneIntegrity:spec.integrity,measurements:measurementNames}
  expect(()=>assertAuthoritative(spec,{source:'local',prompt:result.promptText},ack))
   .toThrow('FINAL_ROOM_INVALID')
  const response=await authority.fetch(post({
   sceneSpecification:spec,candidate:{source:'local',prompt:result.promptText},
   roomAcknowledgement:ack
  }))
  expect(response.status).toBe(400)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('SPEC_ROOM_INVALID')
 })
 it('rejects a forged stale/incomplete gap acknowledgement with HTTP 403',async()=>{
  const {result,spec}=makeScene()
  const response=await authority.fetch(post({
   sceneSpecification:spec,candidate:{source:'local',prompt:result.promptText},
   roomAcknowledgement:{accepted:true,sceneIntegrity:spec.integrity,measurements:['Mirror width: unmeasured']}
  }))
  expect(response.status).toBe(403)
  expect((await response.json() as {errorCode:string}).errorCode).toBe('ROOM_ACK_INVALID')
 })
})
