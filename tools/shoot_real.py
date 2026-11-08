import asyncio
from playwright.async_api import async_playwright
OUT='/workspace/solar-system-shots/real-scale/'
async def main():
  errs=[]
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for name,w,h,mob in [('portrait',390,844,True),('landscape',844,390,True),('desktop',1280,800,False)]:
      ctx=await b.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if mob else 1,is_mobile=mob,has_touch=mob)
      pg=await ctx.new_page()
      pg.on('console',lambda m,n=name: m.type=='error' and errs.append(f'{n}: {m.text}'))
      pg.on('pageerror',lambda e,n=name: errs.append(f'{n} pageerror: {e}'))
      await pg.goto('http://localhost:8766/'); await pg.wait_for_function('window.__kids'); await pg.wait_for_timeout(1500)
      await pg.screenshot(path=f'{OUT}{name}-1-kid-opening.png')
      await pg.click('#introStart'); await pg.wait_for_timeout(300); await pg.mouse.click(10, h//2); await pg.wait_for_timeout(3000)
      await pg.screenshot(path=f'{OUT}{name}-2-kid-overview.png')
      # small planet tap via enlarged hit area: tap 30px away from Mercury
      x,y=await pg.evaluate("window.__solar.screenOf('Mercury')")
      await pg.mouse.click(x+30, y+12); await pg.wait_for_timeout(2000)
      txt=await pg.evaluate("document.getElementById('b-text').textContent")
      print(name,'tap 32px off Mercury ->',txt[:40])
      await pg.screenshot(path=f'{OUT}{name}-3-kid-small-planet-tap.png')
      await pg.evaluate('window.__kids.enterGrownup()'); await pg.wait_for_timeout(1800)
      await pg.screenshot(path=f'{OUT}{name}-4-grownup-overview.png')
      await pg.click('#play')
      await pg.evaluate("window.__solar.focusByName('Earth')"); await pg.wait_for_timeout(1800)
      await pg.evaluate("document.getElementById('info').hidden=true; window.__face('Earth', 20)"); await pg.wait_for_timeout(300)
      await pg.screenshot(path=f'{OUT}{name}-5-earth-africa-europe.png')
      await pg.evaluate("window.__face('Earth', 80)"); await pg.wait_for_timeout(300)
      await pg.screenshot(path=f'{OUT}{name}-6-earth-asia-india.png')
      await pg.click('#realBtn'); await pg.wait_for_timeout(2500)
      await pg.screenshot(path=f'{OUT}{name}-7-real-scale.png')
      await ctx.close()
    await b.close()
  print('console errors:',errs or 'none')
asyncio.run(main())
