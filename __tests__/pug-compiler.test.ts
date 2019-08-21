import PugCompiler from '../src/compiler/PugCompiler';
import * as path from 'path';

const pugCode = `
extends /layout.pug
block content
    v-image(src="@image/aa")
    image(src="@image/bb")
    div(data-a="a") {{content.b}}
    div {{names}}
    div(data-b=b) {{names.length>0?names[0]:0}}
    span {{content.b}}
    view(wx:for="{{arr}}" wx:for-item="itemName" wx:for-index="idx" wx:key="id")
        view(wx:for="{{itemName.arr||otherArr}}") {{item.name}}
    view(wx:for="{{otherArr}}")
        view(wx:for="{{item}}")
            view {{item.value}}
`;

const otherPugCode = `
m-title(title="行程亮点" watermark="HIGHLIGHT")
view(wx:if="{{!basic}}")
view(wx:else)
    view {{basic.name}}
block(wx:for="{{contentList}}" wx:key="$random" wx:for-item="node")
    block(wx:if="{{node.type==='text'}}"): block(wx:for="{{node.para}}" wx:key="$random")
        view.text(style="color:{{node.color}}" class="{{node.align}}")
            image.star(src="@image/jr/star.svg") 
            | {{item.c}} {{node.color}}
view(data-a="{{coupons[0].status}}")
view(wx:for="{{coupons}}") {{item.amt}}
view(data-a="{{showCoupons[0]}}")
view(wx:for="{{showCoupons}}") {{item.amt}}
view(wx:for="{{aList}}" wx:for-item="c")
    view(data-item="{{c}}") {{c.name}}
`

test('pug 解析', ()=>{

    const compiler = new PugCompiler(__dirname, 'test.wxml', pugCode);
    expect(compiler.getImages()).toEqual(['aa', 'bb']);
    expect(compiler.getVImages()).toEqual(['aa']);
    expect(compiler.getMethods()).toEqual(['$$trigger$$pagetap']);
    expect(compiler.getWatchItems()).toEqual([
        '$$minHeight$$', 'content.b', 'names',
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

    const otherCompiler = new PugCompiler(__dirname, 'other.wxml', otherPugCode);
    expect(otherCompiler.getWatchItems()).toEqual([
        "basic",
        {
            path: "contentList",
            watches: [
                "$random","type", 
                { 
                    path: "para",
                    watches: [ "$random","c" ],
                    key: "$random"
                },
                "color", "align"
            ],
            key: "$random"
        },
        {
            path: "coupons",
            watches: ['status', 'amt']
        },
        'showCoupons',
        'aList'
    ])
});