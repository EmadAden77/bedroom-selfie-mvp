import React from 'react'
import {afterEach,describe,it,expect,vi} from 'vitest'
import authorityHandler from '../../api/authorize-final-prompt'
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {App} from '../app/App'

afterEach(()=>{cleanup();vi.unstubAllGlobals()})
describe('App four-source lighting DOM regression',()=>{
 it('exposes only four lights, changes one emitter, and resets to phone screen',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string,options:RequestInit)=>{
   if(url!=='/api/authorize-final-prompt')throw Error('unexpected authority request: '+url)
   return authorityHandler.fetch(new Request('https://bedroom-selfie-mvp.vercel.app'+url,{
    method:options.method,headers:options.headers,body:options.body
   }))
  }))
  render(<App/>)
  const region=screen.getByRole('region',{name:'مصدر الإضاءة الوحيد'})
  expect(within(region).getAllByRole('button')).toHaveLength(4)
  expect(within(region).queryByText(/المصباح الجانبي الدافئ|4500K|إضاءة النافذة/)).toBeNull()
  expect(within(region).getByRole('button',{name:/فلاش الكاميرا الخلفية/})).toBeDisabled()
  expect(within(region).getByRole('button',{name:/شاشة الهاتف/})).toHaveAttribute('aria-pressed','true')
  fireEvent.click(within(region).getByRole('button',{name:/سبوت لايت LED أبيض واحد/}))
  expect(screen.getByText(/المصدر الفعال: ceiling/)).toBeTruthy()
  expect(within(region).getByRole('button',{name:/سبوت لايت LED أبيض واحد/})).toHaveAttribute('aria-pressed','true')
  expect(screen.getByText('Room size assumed as medium. Confirm for accuracy.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'عرض البرومبت المحلي (غير معتمد)'}))
  await waitFor(()=>expect(screen.getByText('البرومبت المحلي — للعرض فقط، غير معتمد')).toBeTruthy())
  expect(fetch).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'إعادة تعيين الخيارات'}))
  expect(within(screen.getByRole('region',{name:'مصدر الإضاءة الوحيد'})).getByRole('button',{name:/شاشة الهاتف/})).toHaveAttribute('aria-pressed','true')
  expect(screen.getByText(/المصدر الفعال: phone_display/)).toBeTruthy()
 })
})
