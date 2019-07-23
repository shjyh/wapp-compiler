import SassCompiler from '../src/compiler/SassCompiler';

const sassCode = `
@import url('rc.wxss');
@import url('./cc.wxss');
.test{
    transform: rotate(7deg);
}
`

test('sass-compiler功能测试', ()=>{
    const compiler = new SassCompiler('/abc', 'def.wxss', sassCode);
    //console.logg(compiler.getResult());
    expect(compiler.getResult()).toEqual({
        'def.wxss': expect.stringContaining('@import \'rc.wxss\'')
    });
    expect(compiler.getResult()).toEqual({
        'def.wxss': expect.stringContaining('@import \'./cc.wxss\'')
    })
})