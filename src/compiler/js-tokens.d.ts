declare module 'js-tokens'{
    const jsTokens: RegExp;
    export default jsTokens;

    export function matchToToken(match: RegExpExecArray): {
        type: 'invalid'|'string'|'comment'|'regex'|'number'|'name'|'punctuator'|'whitespace',
        value: string,
        closed: boolean|undefined
    }
}