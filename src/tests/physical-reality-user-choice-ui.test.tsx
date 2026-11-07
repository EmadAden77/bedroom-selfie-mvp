import React from 'react'
import {afterEach,describe,it,expect} from 'vitest'
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {App} from '../app/App'
import {reconcileCaptureSelection} from '../data/scene-consistency'
import type {CompilationContext} from '../domain/types'

afterEach(cleanup)
describe('Explicit scene selections and visible repair feedback',()=>{
 it('does not silently rewrite an existing mirror flash shot when lighting changes',()=>{
  const previous={
   bedroomShotId:'mirror_rear_flash',nightLightingId:'rear_flash',
   poseId:'standing',mirrorMovementId:'touch_hair'
  } as CompilationContext
  const changed=reconcileCaptureSelection(previous,{nightLightingId:'ceiling_neutral'})
  expect(changed).toEqual({...previous,nightLightingId:'ceiling_neutral'})
 })
 it('keeps the selected mirror shot after a deliberate incompatible lighting choice, showing a conflict',()=>{
  render(<App/>)
  fireEvent.click(screen.getByRole('button',{name:'تفعيل تصوير المرآة'}))
  const mirror=screen.getByRole('region',{name:'قسم مستقل للتصوير أمام المرآة'})
  const flashShot=within(mirror).getByRole('button',{name:/فلاش خلفي أمام المرآة/})
  fireEvent.click(flashShot)
  expect(flashShot.getAttribute('aria-pressed')).toBe('true')
  const lighting=screen.getByRole('region',{name:'الإضاءة الليلية الفيزيائية'})
  fireEvent.click(within(lighting).getByRole('button',{name:/إضاءة السقف البيضاء المعتدلة/}))
  expect(within(mirror).getByRole('button',{name:/فلاش خلفي أمام المرآة/}).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('status').textContent).toContain('CONFLICT')
  expect(screen.getAllByText(/وضعية فلاش المرآة تحتاج فلاش الكاميرا الخلفية/).length).toBeGreaterThan(0)
 })
})
