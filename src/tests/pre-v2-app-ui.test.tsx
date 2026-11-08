import React from 'react'
import {afterEach,describe,it,expect,vi} from 'vitest'
import authorityHandler from '../../api/authorize-final-prompt'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {App} from '../app/App'

afterEach(()=>{cleanup();vi.unstubAllGlobals()})
describe('App V1 strict-light UI regression',()=>{
 it('preserves stored lamp through strict switching, explicit camera correction and reset',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string,options:RequestInit)=>{
   if(url!=='/api/authorize-final-prompt')throw Error('unexpected authority request: '+url)
   const reply=await authorityHandler.fetch(new Request('https://bedroom-selfie-mvp.vercel.app'+url,{
    method:options.method,headers:options.headers,body:options.body
   }))
   return reply
  }))
  render(<App/>)
  fireEvent.click(screen.getByRole('button',{name:/المصباح الجانبي الدافئ/}))
  const mode=screen.getByLabelText('وضع إضاءة الهاتف') as HTMLSelectElement
  expect(screen.getByText(/الإضاءة المحفوظة: led_spotlight/)).toBeTruthy()
  fireEvent.change(mode,{target:{value:'DARK_ROOM_REAR_FLASH_ONLY'}})
  expect(screen.getAllByRole('alert').some(a=>a.textContent?.includes('فلاش الهاتف فقط'))).toBe(true)
  expect(screen.getByText(/الإضاءة المحفوظة: led_spotlight — الإضاءة المستخدمة: camera_flash/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:/اختيار لقطة فلاش المرآة \(بعد موافقتك\)/}))
  expect(screen.getByText(/المصادر الفعالة: phone_rear_led/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:/على البطن مع الكوعين/}))
  expect(screen.getAllByText(/فلاش الهاتف فقط يتطلب لقطة المرآة/).length).toBeGreaterThan(0)
  fireEvent.change(mode,{target:{value:'DARK_ROOM_FRONT_SCREEN_ONLY'}})
  expect(screen.getByText(/المصادر الفعالة: phone_display/)).toBeTruthy()
  expect(screen.getByText(/الإضاءة المحفوظة: led_spotlight — الإضاءة المستخدمة: phone_screen/)).toBeTruthy()
  fireEvent.change(mode,{target:{value:'OFF'}})
  expect(screen.getByText(/المصادر الفعالة: bedside/)).toBeTruthy()
  expect(screen.getByText(/الإضاءة المحفوظة: led_spotlight — الإضاءة المستخدمة: led_spotlight/)).toBeTruthy()
  // PR7b Category 1: light-mode and reset behavior remain unchanged.
  // The default room is unconfirmed, so the formerly-authoritative local
  // button is now preview-only and must NOT call the server authority route.
  expect(screen.getByText('Room size assumed as medium. Confirm for accuracy.')).toBeTruthy()
  const localButton=screen.getByRole('button',{name:'عرض البرومبت المحلي (غير معتمد)'}) as HTMLButtonElement
  fireEvent.click(localButton)
  await waitFor(()=>expect(screen.getByText('البرومبت المحلي — للعرض فقط، غير معتمد')).toBeTruthy())
  expect(fetch).not.toHaveBeenCalled()
  await waitFor(()=>expect(screen.getByRole('button',{name:'إعادة تعيين الخيارات'})).toBeTruthy())
  fireEvent.click(screen.getByRole('button',{name:'إعادة تعيين الخيارات'}))
  expect((screen.getByLabelText('وضع إضاءة الهاتف') as HTMLSelectElement).value).toBe('OFF')
  expect(screen.getByText(/الإضاءة المحفوظة: phone_screen — الإضاءة المستخدمة: phone_screen/)).toBeTruthy()
 })
})
