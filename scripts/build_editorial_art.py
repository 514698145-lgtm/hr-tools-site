"""Draw original editorial diagrams; uses bundled Pillow and OFL-licensed fonts.

Usage: bundled-python scripts/build_editorial_art.py designs/editorial/topic.json
No third-party photographs, book covers or report screenshots are used.
"""
import json
from pathlib import Path
import re
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
COLORS = {'paper':'#FAF8F3','navy':'#263747','gold':'#AB8541','muted':'#756F64','line':'#E5DFD3','white':'#FFFFFF'}


def render(spec):
    slug = spec['slug']
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug):
        raise ValueError('Invalid media slug')
    folder = ROOT/'public/media/editorial'/slug
    folder.mkdir(parents=True, exist_ok=True)
    fonts = ROOT/'public/downloads/template-fonts'
    def font(size, bold=False):
        return ImageFont.truetype(str(fonts/('NotoSansCJKsc-Bold.otf' if bold else 'NotoSansCJKsc-Regular.otf')), size)
    def canvas(height):
        im=Image.new('RGB',(1200,height),COLORS['paper']);return im,ImageDraw.Draw(im)
    def text(draw,xy,s,size=30,bold=False,color='navy'):
        draw.text(xy,s,font=font(size,bold),fill=COLORS.get(color,color))
    def line(draw,xy,fill='line',width=2):draw.line(xy,fill=COLORS[fill],width=width)
    im,d=canvas(675)
    if spec['layout']=='report':
        d.rectangle((0,0,14,675),fill=COLORS['gold'])
        text(d,(66,46),'HR WORKSTATION  /  INDUSTRY NOTES',20,color='gold')
        text(d,(66,142),spec['coverLines'][0],52,True)
        text(d,(66,222),spec['coverLines'][1],52,True)
        line(d,(68,336,744,336))
        for i,s in enumerate(spec['coverSubtitles']):text(d,(68,364+i*48),s,28,color='muted')
        for i,(label,sub) in enumerate(spec['coverSignals']):
            y=66+i*133
            d.rounded_rectangle((827,y,1135,y+108),radius=12,fill=COLORS['white'],outline=COLORS['line'],width=2)
            text(d,(851,y+14),label,31,True)
            text(d,(851,y+60),sub,21,color='muted')
        text(d,(68,580),'公开介绍解读',24,color='gold')
        text(d,(68,620),spec['dateLabel'],19,color='muted')
    else:
        d.rectangle((0,0,1200,205),fill=COLORS['navy'])
        text(d,(62,38),'HR WORKSTATION  /  RECRUITMENT',20,color='#DCC795')
        text(d,(62,88),spec['coverLines'][0],56,True,color='#FFFFFF')
        text(d,(62,248),spec['coverLines'][1],48,True)
        for i,s in enumerate(spec['coverSubtitles']):text(d,(64,326+i*45),s,28,color='muted')
        for i,(label,sub) in enumerate(spec['coverSignals']):
            x=64+i*280
            d.rounded_rectangle((x,470,x+235,584),radius=10,fill=COLORS['white'],outline=COLORS['line'],width=2)
            text(d,(x+20,483),label,30,True)
            text(d,(x+20,532),sub,21,color='muted')
            if i<3:text(d,(x+246,497),'→',25,color='gold')
        text(d,(64,622),spec['dateLabel'],19,color='muted')
    im.save(folder/'cover.webp','WEBP',quality=88,method=6)
    im,d=canvas(900)
    text(d,(60,42),spec['diagramTitle'],43,True)
    text(d,(62,116),spec['diagramSubtitle'],25,color='muted')
    for i,node in enumerate(spec['nodes']):
        x=60+(i%2)*560;y=200+(i//2)*285
        d.rounded_rectangle((x,y,x+520,y+246),radius=14,fill=COLORS['white'],outline=COLORS['line'],width=2)
        d.rectangle((x+25,y+28,x+31,y+66),fill=COLORS['gold'])
        text(d,(x+48,y+23),node['title'],34,True)
        for j,s in enumerate(node['lines']):
            if d.textbbox((0,0),s,font=font(27))[2] > 465:
                raise ValueError('Diagram text too wide: '+s)
            text(d,(x+28,y+91+j*46),s,27,color='muted')
    line(d,(60,807,1140,807))
    text(d,(62,830),spec['diagramFooter'],20,color='muted')
    im.save(folder/'framework.webp','WEBP',quality=90,method=6)
    return [str(p.relative_to(ROOT)) for p in folder.glob('*.webp')]


if __name__=='__main__':
    for filename in sys.argv[1:]:
        print(json.dumps(render(json.loads(Path(filename).read_text(encoding='utf-8'))),ensure_ascii=False))
