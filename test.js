const PugCompiler = require('./dist/compiler/PugCompiler').default;

const otherPugCode = `
m-title(title="行程亮点" watermark="HIGHLIGHT")
block(wx:for="{{contentList}}" wx:key="$random" wx:for-item="node")
    block(wx:if="{{node.type==='text'}}"): block(wx:for="{{node.para}}" wx:key="$random")
        view.text(style="color:{{node.color}}" class="{{node.align}}")
            image.star(src="@image/jr/star.svg") 
            | {{item.c}} {{node.color}}
`

const c = new PugCompiler(__dirname, 'other.wxml', otherPugCode);

console.log(c.getWatchItems());