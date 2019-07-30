import JSONCompiler from '../src/compiler/JSONCompiler';

const json = `
{
    a: 1
}
`

test('json 压缩', ()=>{
    const compiler = new JSONCompiler('a/app.json', json);
    expect(compiler.getJsonObj()).toEqual({a:1});
    expect(compiler.getResult()).toEqual({
        'a/app.json': '{"a":1}'
    })
})