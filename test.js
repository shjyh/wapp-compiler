const PugCompiler = require('./dist/compiler/PugCompiler').default;

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
view(wx:for="{{otherList}}" wx:for-item="c")
    view(wx:for="{{c.list}}")
        view(data-item="{{item}}")
`

const c = new PugCompiler(__dirname, 'other.wxml', otherPugCode);

console.log(c.getWatchItems());