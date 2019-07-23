import WatchItem from './WatchItem';
import mustache from 'mustache';
import parseVarible from './parseVarible';

export interface AstAttr {
    name: string;
    val: string
}

export interface AstNode {
    type: string;
    line: number;
    column: number | null;
    filename: string | null;
}
export interface AstBlock extends AstNode {
    type: 'Block'|'NamedBlock';
    nodes: AstNode[];
}
export interface AstTag extends AstNode {
    type: 'Tag';
    name: string;
    block?: AstNode[];
    attrs?: AstAttr[];
}
export interface AstText extends AstNode {
    type: 'Text';
    val: string;
}

export default function parseAst(ast: AstBlock){
    for(let node of ast.nodes){
        if(node.type==='Block'||node.type==='NamedBlock'){
            parseAst(node as AstBlock);
            break;
        }
        if(node.type==='Text'){
            parseMustacheTpl((node as AstText).val);
        }
    }
}

function combinArray(raw: any[], into: any[]){
    for(let item of into){
        if(raw.includes(item)) continue;
        raw.push(item);
    }
}

function parseMustacheTpl(val: string): string[]{
    const resultExps: string[] = mustache.parse(val)
        .filter(n=>n[0]==='name').map(n=>n[1]);
    const vals = [];
    for(let exp of resultExps){
        combinArray(vals, parseVarible(exp));
    }
    return vals;
}