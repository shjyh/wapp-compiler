import PugCompiler from '../src/compiler/PugCompiler';
import * as path from 'path';

const pugCode = `
extends /layout.pug
block content
    v-image(src="@image/aa")
    image(src="@image/bb")
    div(data-a="a") {{content.b}}
    div(data-b=b) {{names.length>0?names[0]:0}}
    span {{content.b}}
    view(wx:for="{{arr}}" wx:for-item="itemName" wx:for-index="idx" wx:key="id")
        view(wx:for="{{itemName.arr||otherArr}}") {{item.name}}
    view(wx:for="{{otherArr}}")
        view(wx:for="{{item}}")
            view {{item.value}}
`;

test('pug 解析', ()=>{
    const compiler = new PugCompiler(__dirname, 'test.wxml', pugCode);
    expect(compiler.getImages()).toEqual(['aa', 'bb']);
    expect(compiler.getVImages()).toEqual(['aa']);
    expect(compiler.getMethods()).toEqual(['$$trigger$$pagetap']);
    expect(compiler.getWatchItems()).toEqual([
        '$$minHeight$$', 'content.b', 'names.length', 'names[0]',
        { 
            path: 'arr', 
            watches: [
                'id', 
                {
                    path: 'arr',
                    watches: ['name']
                } 
            ], 
            key: 'id' 
        },
        {
            path: 'otherArr',
            watches: {
                path: '',
                watches: ['value']
            }
        }
    ]);
    expect(compiler.getResult({aa:'xxxxxxaa.svg', 'bb': 'xxxxxxxbb.svg'})).toEqual({
        'test.wxml': expect.stringContaining('xxxxxxxbb.svg')
    });
});