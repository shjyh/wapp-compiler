import conditionParse from '../src/conditionParse';
require
const code = `
/// #if DEBUG
output if DEBUG
/// #else
output if not DEBUG
/// #endif
`;

const codeResult = `
output if DEBUG
`

test('条件预处理', ()=>{
    expect(conditionParse(code, {DEBUG: true})).toBe(codeResult);
});