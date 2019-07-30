import WatchItem, { ArrayWatchItem, NestedArrayWatchItem } from './WatchItem';
import mustache from 'mustache';
import parseVarible from './parseVarible';

export interface AstAttr {
    name: string;
    val: string|boolean
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
    block?: AstBlock;
    attrs?: AstAttr[];
}
export interface AstText extends AstNode {
    type: 'Text';
    val: string;
}

export interface AstParseResult {
    methods: string[],
    watchItems: WatchItem[],
    images: string[],
    vImages: string[]
}

interface WxForBlock {
    watches: ArrayWatchItem[];
    itemName: string;
    indexName: string;
}

/**
 * wx:for会产生独立作用域
 * @param WxForBlock 标识模板数组作用域，数组越后嵌套越浅
 * @returns 是否需要移除该Tag
 */
function parseAstTag(astTag: AstTag, result: AstParseResult, forBlocks: WxForBlock[]): boolean{
    if(astTag.name==='v-image'){
        parseImage(astTag, result);
        return true;
    }
    if(astTag.name==='image'){
        parseImage(astTag, result);
    }

    const normalAttrVals = [];
    const forBlocksShadow = [...forBlocks];

    const thisForBlock: WxForBlock = {
        itemName: 'item',
        indexName: 'index',
        watches: []
    }
    let wxForVars: string[] = [];
    let wxForKey = undefined;

    for(let attr of astTag.attrs||[]){
        if(typeof attr.val !== 'string') continue;
        const val = unWrapperAttrVal(attr.val);
        switch(attr.name){
            case 'wx:for-item':
                thisForBlock.itemName = val;
                continue;
            case 'wx:for-index':
                thisForBlock.indexName = val;
                continue;
            case 'wx:for':
                wxForVars = parseMustacheTpl(val);
                continue;
            case 'wx:key':
                wxForKey = val;
                continue;
        }
        if(/^(capture-)?(bind|catch):?/.test(attr.name)){
            result.methods.push(val);
            continue;
        }
        normalAttrVals.push(val);
    }

    if(wxForVars.length){
        combineForBlock(result, thisForBlock, wxForVars, wxForKey, forBlocksShadow);
    }

    for(let val of normalAttrVals){
        combinWatchItems(result, forBlocksShadow, parseMustacheTpl(val));
    }
    
    parseAstNodes(astTag.block.nodes, result, forBlocksShadow);
    return false;
}

function parseAstNodes(nodes: AstNode[], result: AstParseResult, forBlocks: WxForBlock[]){
    const removeNodes: AstNode[] = [];
    for(let node of nodes){
        if(node.type==='Tag'){
            if(parseAstTag(node as AstTag, result, forBlocks)){
                removeNodes.push(node);
            }
        }
        else if(node.type==='Block'||node.type==='NamedBlock'){
            parseAstNodes((node as AstBlock).nodes, result, forBlocks);
        }
        else if(node.type==='Text') parseAstText(node as AstText, result, forBlocks);
    }
    for(let rNode of removeNodes){
        nodes.splice(nodes.indexOf(rNode), 1);
    }
}
function parseAstText(astText: AstText, result: AstParseResult, forBlocks: WxForBlock[]){
    combinWatchItems(result, forBlocks, parseMustacheTpl(astText.val));
}

function parseImage(imageTag: AstTag, result: AstParseResult){
    const attr = imageTag.attrs.find(attr=>attr.name==='src');
    if(!attr) return;
    if(typeof attr.val !== 'string') return;
    let val = unWrapperAttrVal(attr.val);
    if(!val.startsWith('@image/')) return;
    const imageName = val.substr(7);
    if(imageTag.name==='v-image'){
        if(!result.vImages.includes(imageName)){
            result.vImages.push(imageName);
        }
    }

    attr.val = `'/'+images["${imageName}"]`;
    if(!result.images.includes(imageName)){
        result.images.push(imageName);
    }
}

/**
 * @description 去掉val外层的引号
 * @param val AstAttr val属性
 */
function unWrapperAttrVal(val: string): string{
    if(val.startsWith('\'')||val.startsWith('"')){
        return val.substring(1, val.length-1);
    }
    return val;
}

function unWrapperedScope(path: string, scope: string): string|null{
    if(path.startsWith(scope+'.')){
        return path.substr(scope.length + 1);
    }
    if(path.startsWith('scope' + '[')){
        return path.substr(scope.length);
    }
    return null;
}

function getArrayWatchItem(path, key): ArrayWatchItem{
    const item: ArrayWatchItem = {
        path,
        watches: (key&&key!=='*this')?[key]:[]
    }
    if(key) item.key = key;
    return item;
}

function combineForBlock(result: AstParseResult, thisForBlock: WxForBlock, vars: string[], key: string, forBlocks: WxForBlock[]){
    for(let v of vars){
        let resolved = false;
        for(let forBlock of forBlocks){
            if(v===forBlock.indexName||unWrapperedScope(v, forBlock.indexName)){
                resolved = true;
                break;
            }
            if(v===forBlock.itemName){
                forBlock.watches.forEach(watch=>{
                    const thisBlockWatch: NestedArrayWatchItem = getArrayWatchItem('', key) as NestedArrayWatchItem;
                    thisForBlock.watches.push(thisBlockWatch);
                    watch.watches = thisBlockWatch;
                });
                resolved = true;
                break;
            }
            const path = unWrapperedScope(v, forBlock.itemName);
            if(!path) break;

            forBlock.watches.forEach(watch => {
                if(Array.isArray(watch.watches)){
                    const w = combineArrayWatchItems(watch.watches, getArrayWatchItem(path, key));
                    if(w) thisForBlock.watches.push(w);
                }
            })
            resolved = true;
        }

        if(!resolved){
            const w = combineArrayWatchItems(result.watchItems, getArrayWatchItem(v, key));
            if(w) thisForBlock.watches.push(w);
        }
    }
    forBlocks.unshift(thisForBlock);
}

function combineArrayWatchItems(watches: WatchItem[], arrayWatch: ArrayWatchItem): ArrayWatchItem|false{

    const filterWatches = watches.filter(w=>{
        const path = typeof w === 'string' ? w : w.path;
        return !path.startsWith(arrayWatch.path + '.')&&!path.startsWith(arrayWatch.path + '[');
    });
    watches.length = 0;
    watches.push(...filterWatches);

    const alreadyInclude = watches.find(w=>{
        const path = typeof w === 'string' ? w : w.path;
        return arrayWatch.path.startsWith(path + '.')||arrayWatch.path.startsWith(path + '[')||arrayWatch.path === path;
    });
    
    if(!alreadyInclude){
        watches.push(arrayWatch);
        return arrayWatch;
    }

    if(typeof alreadyInclude === 'string') return false;
    if(alreadyInclude.path!==arrayWatch.path) return false;
    return alreadyInclude;
}

function combinWatchItems(result: AstParseResult, forBlocks: WxForBlock[], vars: string[]){
    for(let v of vars){
        let resolved = false;
        for(let forBlock of forBlocks){
            if(v===forBlock.indexName||unWrapperedScope(v, forBlock.indexName)){
                resolved = true;
                break;
            }
            if(v===forBlock.itemName){
                forBlock.watches.forEach(watch=>{
                    watch.watches = null;
                });
                resolved = true;
                break;
            }
            const path = unWrapperedScope(v, forBlock.itemName);
            if(!path) break;

            forBlock.watches.forEach(watch => {
                if(!watch.watches) return;
                if(!Array.isArray(watch.watches)) return;

                insertWatchStringItem(watch.watches, path);
            })
            resolved = true;
        }

        if(!resolved){
            insertWatchStringItem(result.watchItems, v);
        }
    }
}

function insertWatchStringItem(watches: WatchItem[], watchItem: string){
    const filterWatches = watches.filter(w=>{
        const path = typeof w === 'string' ? w : w.path;
        return !path.startsWith(watchItem + '.')&&!path.startsWith(watchItem + '[');
    });
    watches.length = 0;
    watches.push(...filterWatches);
    if(!watches.find(w=>{
        const path = typeof w==='string' ? w : w.path;
        return watchItem.startsWith(path + '.')||watchItem.startsWith(path + '[')||watchItem === path;
    })){
        watches.push(watchItem);
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

export default function parseAst(ast: AstBlock): AstParseResult{
    const result: AstParseResult = {
        watchItems: [],
        methods: [],
        images: [],
        vImages: []
    };
    parseAstNodes(ast.nodes||[], result, []);
    return result;
}