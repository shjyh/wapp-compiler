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
    view(wx:for="{{arr}}" wx:for-item="itemName" wx:for-index="idx" key="id")
        view(wx:for="{{itemName.arr}}) {{item.name}}
`

test('pug 解析', ()=>{
    const compiler = new PugCompiler(__dirname, path.resolve(__dirname, 'test.wxml'), pugCode);
})