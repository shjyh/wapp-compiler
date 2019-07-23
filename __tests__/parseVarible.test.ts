import parseVarible from '../src/compiler/parseVarible';

test('表达式解析测试', ()=>{
    expect(parseVarible('a')).toEqual(['a']);
    expect(parseVarible('a.b')).toEqual(['a.b']);
    expect(parseVarible('a[b],a[0]')).toEqual(['a', 'b', 'a[0]']);
    expect(parseVarible('a[1][b],a[0]')).toEqual(['a[1]', 'b', 'a[0]']);
    expect(parseVarible('a[b[0]],a[0]')).toEqual(['a', 'b[0]', 'a[0]']);
    expect(parseVarible('a === 3 ? b.length : c')).toEqual(['a', 'b.length', 'c']);
    expect(parseVarible('[1,2,4, \'aaa\']')).toEqual([]);
    expect(parseVarible('tour.abc(item, \'other\', rrr)')).toEqual(['item', 'rrr']);
});