import React from 'react'
import {afterEach,describe,it,expect,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {BodyMechanicsSelector} from '../features/body-mechanics/BodyMechanicsSelector'
import type {CompilationContext} from '../domain/types'

afterEach(cleanup)
const ctx:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',
 stateId:'observed_natural_state',color:'apparent dark charcoal-gray as observed',
 surface:'apparent knit-like surface character',referenceImagePresent:false,
 bedroomShotId:'bed_edge',nightLightingId:'phone_screen_only',poseId:'seated_bed'
}
describe('Arabic RTL body mechanics UI',()=>{
 it('shows derived bed support without requiring exact physical measurements',()=>{
  const onChange=vi.fn()
  render(<div dir="rtl"><BodyMechanicsSelector ctx={ctx} onChange={onChange}/></div>)
  expect(screen.getByRole('status').textContent).toContain('VALID')
  expect(screen.getByText(/نقاط التلامس/).textContent).toContain('المرتبة')
  expect(screen.getByLabelText('يد الهاتف')).toBeTruthy()
  expect(onChange).not.toHaveBeenCalled()
 })
 it('does not silently change selected hand, pose or clothing',()=>{
  const onChange=vi.fn()
  render(<BodyMechanicsSelector ctx={ctx} onChange={onChange}/>)
  fireEvent.change(screen.getByLabelText('يد الهاتف'),{target:{value:'left'}})
  expect(onChange).toHaveBeenCalledWith({bodyHoldingHand:'left'})
  expect(ctx.upperGarmentId).toBe('reference_garment_preserved')
  expect(ctx.poseId).toBe('seated_bed')
 })
 it('shows invalid support with an explicit correction button instead of self-applying changes',()=>{
  const onChange=vi.fn()
  render(<BodyMechanicsSelector ctx={{...ctx,bodySupportChoice:'floor'}} onChange={onChange}/>)
  expect(screen.getByRole('status').textContent).toContain('INVALID')
  expect(screen.getByRole('alert').textContent).toContain('BODY_SUPPORT_CONFLICT')
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'اعتماد تصحيح هذا التعارض'}))
  expect(onChange).toHaveBeenCalledWith({bodySupportChoice:'auto'})
 })
 it('distinguishes uncertain support from confirmed contradictions without blocking',()=>{
  render(<BodyMechanicsSelector ctx={{...ctx,bodySupportChoice:'unknown',bodyFeetVisibility:'outside_crop'}} onChange={vi.fn()}/>)
  expect(screen.getByRole('status').textContent).toContain('NEEDS_INFORMATION')
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.getByText(/يبقى المشهد مسموحًا/)).toBeTruthy()
 })
 it('keeps optional feet-visibility state under a collapsed detail disclosure',()=>{
  const onChange=vi.fn()
  render(<BodyMechanicsSelector ctx={ctx} onChange={onChange}/>)
  fireEvent.click(screen.getByText(/معلومات الظهور واليد الأخرى/))
  fireEvent.change(screen.getByLabelText('ظهور القدمين'),{target:{value:'occluded'}})
  expect(onChange).toHaveBeenCalledWith({bodyFeetVisibility:'occluded'})
 })
})
