import TsCompiler from '../src/compiler/TsCompiler';

const code = `
import a from 'a/b';
import b from './b';
import root from 'root/root-module';
import 'root/run';

const c: string = '';
console.log(a, b, c, root);
`

test('ts-compiler 功能测试', ()=>{
    const npmList = [];
    const compiler = new TsCompiler('dir/inner/test.ts', code, npmList, false);

    //console.logg(compiler.getResult()['dir/inner/test.ts']);

    expect(npmList).toEqual(['@babel/runtime-corejs3/helpers/interopRequireDefault', 'a/b']);
    expect(compiler.getLastError()).toBe(null);
    expect(compiler.getResult()).toEqual({
        'dir/inner/test.ts': expect.stringContaining('require("../../root-module")')
    });
    expect(compiler.getResult()).toEqual({
        'dir/inner/test.ts': expect.stringContaining('require("../../run")')
    });
    expect(compiler.getResult()).toEqual({
        'dir/inner/test.ts': expect.stringContaining('_$lib$_.n[1]')
    });
    expect(compiler.getResult()).toEqual({
        'dir/inner/test.ts': expect.stringContaining('require("../../lib")')
    });
})