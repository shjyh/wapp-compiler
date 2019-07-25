import SFCCompiler from '../src/compiler/SFCCompiler';

test('sfc单文件测试', ()=>{
    const code = `
<config>
{
    "title": "abc"
}
</config>
<style lang="scss">
.a {
    color: red;
}
</style>
<template lang="pug">
view
    view.title {{title.name}}
    view.desc(bindtap="see")
</template>

<script lang="ts">
import debounce from 'lodash-es/debounce';
debounce('test');
export default {

}
</script>
    `

    const npmList = [];
    const compiler = new SFCCompiler(__dirname, 'a/b/c.vue', code, npmList, false, {}, null);

    const result = compiler.getResult({});
    expect(result['a/b/c.js']).toBe(`require('../../lib').p(require('./c.factory.js'),["title.name"],["see"])`);
    expect(result['a/b/c.factory.js']).toBeTruthy();
    expect(result['a/b/c.wxml']).toBeTruthy();
    expect(result['a/b/c.json']).toBe('{"title":"abc"}');
    expect(result['a/b/c.wxss']).toBe('.a{color:red}');
    //console.logg(compiler.getResult({}));
})