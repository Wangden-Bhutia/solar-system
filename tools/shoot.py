import asyncio
from playwright.async_api import async_playwright
OUT='/workspace/solar-system-shots/'
async def main():
  errs=[]
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for name,w,h,mob in [('phone-portrait',390,844,True),('phone-landscape',844,390,True),('desktop',1280,800,False)]:
      ctx=await b.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if mob else 1,is_mobile=mob,has_touch=mob)
      pg=await ctx.new_page()
      pg.on('console',lambda m,n=name: m.type=='error' and errs.append(f'{n}: {m.text}'))
      pg.on('pageerror',lambda e,n=name: errs.append(f'{n} pageerror: {e}'))
      await pg.goto('http://localhost:8765/'); await pg.wait_for_timeout(2500)
      await pg.screenshot(path=f'{OUT}{name}-overview.png')
      await pg.click('#lbls'); await pg.wait_for_timeout(200)  # labels off to see trails clearly
      await pg.fill('#speed','1'); await pg.dispatch_event('#speed','input'); await pg.wait_for_timeout(1500)
      await pg.screenshot(path=f'{OUT}{name}-trails.png')
      await pg.click('#lbls'); await pg.fill('#speed','0'); await pg.dispatch_event('#speed','input')
      # tap Saturn label via real click
      await pg.click('.lbl:text-is("Saturn")', force=True); await pg.wait_for_timeout(2200)
      await pg.screenshot(path=f'{OUT}{name}-focus-saturn.png')
      vis=await pg.is_visible('#info'); print(name,'info visible:',vis)
      await ctx.close()
    await b.close()
  print('console errors:',errs or 'none')
asyncio.run(main())
