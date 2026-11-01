import React from 'react'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {PhysicalRoomStateSelector} from '../features/room-clutter/PhysicalRoomStateSelector'
import {DEFAULT_ROOM_PHYSICAL_STATE} from '../data/room-physical-state'

afterEach(cleanup)
describe('Physical room state selectors',()=>{
 it('shows the requested starting state and all selected physical zones',()=>{
  const change=vi.fn()
  const state={...DEFAULT_ROOM_PHYSICAL_STATE,zones:[...DEFAULT_ROOM_PHYSICAL_STATE.zones]}
  render(<PhysicalRoomStateSelector value={state} onChange={change} roomReferencePresent={true}/>)
  expect(screen.getByRole('button',{name:/فوضى واضحة/}).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button',{name:'غبار محدود'}).getAttribute('aria-pressed')).toBe('true')
  expect((screen.getByRole('checkbox',{name:'السرير'}) as HTMLInputElement).checked).toBe(true)
  expect((screen.getByRole('checkbox',{name:'الأرضية'}) as HTMLInputElement).checked).toBe(true)
  expect((screen.getByRole('checkbox',{name:'التسريحة'}) as HTMLInputElement).checked).toBe(true)
  expect((screen.getByRole('checkbox',{name:'الكومود'}) as HTMLInputElement).checked).toBe(true)
  expect((screen.getByRole('checkbox',{name:'تثبيت ترتيب الأغراض بين صور الجلسة'}) as HTMLInputElement).checked).toBe(true)
  expect(screen.getByText(/معاينة العناصر المختارة/).textContent).toContain('8')
 })
 it('edits zone permissions without altering other choices',()=>{
  const change=vi.fn()
  render(<PhysicalRoomStateSelector value={{...DEFAULT_ROOM_PHYSICAL_STATE}} onChange={change} roomReferencePresent={false}/>)
  fireEvent.click(screen.getByRole('checkbox',{name:'التسريحة'}))
  expect(change).toHaveBeenCalledWith(expect.objectContaining({
   order:'clear',surface:'dust',sessionLocked:true,zones:['bed','floor','nightstand']
  }))
 })
 it('reset restores room reference without adding physical damage',()=>{
  const change=vi.fn()
  render(<PhysicalRoomStateSelector value={{...DEFAULT_ROOM_PHYSICAL_STATE}} onChange={change} roomReferencePresent={false}/>)
  fireEvent.click(screen.getByRole('button',{name:/إعادة حالة الغرفة إلى المرجع/}))
  expect(change).toHaveBeenCalledWith(expect.objectContaining({order:'reference',surface:'reference'}))
 })
})
