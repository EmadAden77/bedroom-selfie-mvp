import React from 'react'
import {afterEach,describe,it,expect,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {BeddingPhysicsSelector} from '../features/bedding-physics/BeddingPhysicsSelector'
import type {CompilationContext} from '../domain/types'
afterEach(cleanup)
const ctx:CompilationContext={
 hairVariantId:'reference_natural_dry',expressionVariantId:'reference_expression_preserved',
 upperGarmentId:'reference_garment_preserved',lowerGarmentId:null,
 materialId:'lightweight_cotton_appearance_jersey',fitId:'regular',stateId:'observed_natural_state',
 color:'apparent dark charcoal-gray as observed',surface:'apparent knit-like surface character',
 referenceImagePresent:false,bedroomShotId:'bed_edge',poseId:'seated_bed',nightLightingId:'phone_screen' as const
}
describe('V2.2 Arabic bedding UI and consent',()=>{
 it('shows derived causal counts without altering selections',()=>{
  const onChange=vi.fn()
  render(<div dir="rtl"><BeddingPhysicsSelector ctx={ctx} onChange={onChange}/></div>)
  expect(screen.getByRole('status').textContent).toContain('VALID')
  expect(screen.getByText(/تلامسات مترابطة/)).toBeTruthy()
  expect(onChange).not.toHaveBeenCalled()
 })
 it('updates only selected textile state, not pose, light or room layout',()=>{
  const onChange=vi.fn()
  render(<BeddingPhysicsSelector ctx={ctx} onChange={onChange}/>)
  fireEvent.click(screen.getByText(/وجود الشرشف والوسادة والبطانية/))
  fireEvent.change(screen.getByLabelText('الشرشف'),{target:{value:'confirmed'}})
  expect(onChange).toHaveBeenCalledWith({beddingSelection:{sheet:'confirmed',pillow:'reference',blanket:'reference'}})
  expect(ctx.bedroomShotId).toBe('bed_edge')
  expect(ctx.nightLightingId).toBe('phone_screen')
 })
 it('rejects missing selected pillow and applies correction only after explicit click',()=>{
  const onChange=vi.fn()
  render(<BeddingPhysicsSelector ctx={{...ctx,bedroomShotId:'cheek_pillow',beddingSelection:{sheet:'reference',pillow:'absent',blanket:'reference'}}} onChange={onChange}/>)
  expect(screen.getByRole('status').textContent).toContain('INVALID')
  expect(screen.getByRole('alert').textContent).toContain('BEDDING_PILLOW_ABSENT')
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'اعتماد تصحيح هذا التعارض'}))
  expect(onChange).toHaveBeenCalledWith({beddingSelection:{sheet:'reference',pillow:'reference',blanket:'reference'}})
 })
 it('a blanked-out blanket shot visibly reports conflict rather than silently turning it on',()=>{
  const onChange=vi.fn()
  render(<BeddingPhysicsSelector ctx={{...ctx,bedroomShotId:'blanket_cocoon',beddingSelection:{sheet:'reference',pillow:'reference',blanket:'absent'}}} onChange={onChange}/>)
  expect(screen.getByRole('status').textContent).toContain('INVALID')
  expect(screen.getByRole('alert').textContent).toContain('BEDDING_BLANKET_ABSENT')
  expect(onChange).not.toHaveBeenCalled()
 })
})
