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
    watches: WatchItem[];
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
        combineWatchItems(result, forBlocksShadow, parseMustacheTpl(val));
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
    combineWatchItems(result, forBlocks, parseMustacheTpl(astText.val));
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

// 合并当前for block域
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

                    if(typeof watch === 'string') return;
                    watch.watches = thisBlockWatch;
                });
                resolved = true;
                break;
            }
            const path = unWrapperedScope(v, forBlock.itemName);
            if(!path) continue;

            forBlock.watches.forEach(watch => {
                if(typeof watch === 'string') return;
                if(Array.isArray(watch.watches)){
                    const w = insertWatchArrayItem(watch.watches, getArrayWatchItem(path, key));
                    if(w) thisForBlock.watches.push(w);
                }
            })
            resolved = true;
        }

        if(!resolved){
            const w = insertWatchArrayItem(result.watchItems, getArrayWatchItem(v, key));
            if(w) thisForBlock.watches.push(w);
        }
    }
    forBlocks.unshift(thisForBlock);
}

function insertWatchArrayItem(watches: WatchItem[], arrayWatch: ArrayWatchItem): ArrayWatchItem|false{
    const filterWatches: WatchItem[] = [];

    // array watch 子项，需要合并进入该ArrayWatch
    let childWatches: WatchItem[] = [];

    for(let w of watches){
        const path = typeof w === 'string' ? w : w.path;
        if(!path.startsWith(arrayWatch.path + '.')&&!path.startsWith(arrayWatch.path + '[')){
            filterWatches.push(w);
        }else{
            if(path.startsWith(arrayWatch.path + '[')) childWatches.push(w);
        }
    }
    watches.length = 0;
    watches.push(...filterWatches);

    const alreadyInclude = watches.find(w=>{
        const path = typeof w === 'string' ? w : w.path;
        return arrayWatch.path.startsWith(path + '.')||arrayWatch.path.startsWith(path + '[')||arrayWatch.path === path;
    });
    
    if(!alreadyInclude){
        const result = combineChildWatches(arrayWatch);
        if(typeof result === 'string'){
            insertWatchStringItem(watches, result);
            return false;
        }
        watches.push(arrayWatch);
        return arrayWatch;
    }

    if(typeof alreadyInclude === 'string') return false;
    if(alreadyInclude.path!==arrayWatch.path) return false;

    if(!Array.isArray(alreadyInclude.watches)&&!Array.isArray(arrayWatch.watches)){
        combineNestedArrayWatch(alreadyInclude.watches, arrayWatch.watches);
        return alreadyInclude;
    }
    //如果只有一个是嵌套数组，返回alreadyInclude。
    if(!Array.isArray(alreadyInclude.watches)||!Array.isArray(arrayWatch.watches)){
        throw new Error('模板嵌套数组错误');
    }

    for(let w of arrayWatch.watches){
        insertWatchItem(alreadyInclude.watches, w)
    }
    return alreadyInclude;

    //合并数组子项，若合并后需返回整个数组项，则返回该数组path
    function combineChildWatches(arrayWatch: ArrayWatchItem): ArrayWatchItem|string{
        if(!Array.isArray(arrayWatch.watches)){
            childWatches = childWatches.map(w=>{
                if(typeof w === 'string') return unwrapperArrayParent(w, arrayWatch.path);
                else return {
                    path: unwrapperArrayParent(w.path, arrayWatch.path),
                    watches: w.watches,
                    key: w.key
                }
            });
            return combineChildWatches(arrayWatch.watches);
        };
        for(let w of childWatches){
            if(typeof w === 'string'){
                const p = unwrapperArrayParent(w, arrayWatch.path);
                if(p==='') return arrayWatch.path;
                else insertWatchStringItem(arrayWatch.watches, p);
            }
            else{
                const p = unwrapperArrayParent(w.path, arrayWatch.path);
                if(p==='') return arrayWatch.path;
                insertWatchArrayItem(arrayWatch.watches, {
                    path: p,
                    watches: w.watches,
                    key: w.key
                });
            }
        }
        return arrayWatch;
    }

    function unwrapperArrayParent(path:string, arrayPath:string): string{
        if(!path.startsWith(arrayPath + '[')) throw new Error('模板数组错误');
        path = path.substring(arrayPath.length);
        if(!/^\[[0-9]+?\]\.?/.test(path)) throw new Error('模板数组错误');
        return path.replace(/^\[[0-9]+?\]\.?/, '');
    }
}

function insertWatchItem(watches: WatchItem[], watch: ArrayWatchItem|string){
    if(typeof watch === 'string') insertWatchStringItem(watches, watch);
    else insertWatchArrayItem(watches, watch);
}

function combineNestedArrayWatch(a1: NestedArrayWatchItem, a2: NestedArrayWatchItem){
    if(!Array.isArray(a1.watches)&&!Array.isArray(a2.watches)){
        combineNestedArrayWatch(a1.watches, a2.watches);
        return;
    }
    if(Array.isArray(a1.watches)&&Array.isArray(a2.watches)){
        for(let w of a2.watches) insertWatchItem(a1.watches, w);
        return;
    }

    throw new Error('模板嵌套数组错误');
}

function combineWatchItems(result: AstParseResult, forBlocks: WxForBlock[], vars: string[]){
    for(let v of vars){
        let resolved = false;
        for(let forBlock of forBlocks){
            if(v===forBlock.indexName||unWrapperedScope(v, forBlock.indexName)){
                resolved = true;
                break;
            }
            if(v===forBlock.itemName){
                forBlock.watches = forBlock.watches.map(watch=>{
                    if(typeof watch === 'string') return watch;
                    
                    insertWatchStringItem(result.watchItems, watch.path);
                    return watch.path;
                });
                resolved = true;
                break;
            }
            const path = unWrapperedScope(v, forBlock.itemName);
            if(!path) continue;

            forBlock.watches.forEach(watch => {
                if(typeof watch === 'string') return;
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
    //过滤 ${watchItem}.$any 和 ${watchItem}[$any] 或 watchItem相同的arrayItem
    const filterWatches = watches.filter(w=>{
        if(typeof w !== 'string' && w.path === watchItem) return false;

        const path = typeof w === 'string' ? w : w.path;
        return !path.startsWith(watchItem + '.')&&!path.startsWith(watchItem + '[');
    });
    watches.length = 0;
    watches.push(...filterWatches);

    //若当前监听列表中存在watchItem或watchItem父项，不做处理
    if(!watches.find(w=>{
        const path = typeof w==='string' ? w : w.path;
        return watchItem.startsWith(path + '.')||watchItem.startsWith(path + '[')||watchItem === path;
    })){
        watches.push(watchItem);
    }
}

function combineArray(raw: any[], into: any[]){
    for(let item of into){
        if(raw.includes(item)) continue;
        raw.push(item);
    }
}

function parseMustacheTpl(val: string): string[]{
    //!basic 会解析成 ['!','basic', ...] 需特殊处理
    const resultExps: string[] = mustache.parse(val)
        .filter(n=>n[0]==='name'||n[0]==='!').map(n=>{
            if(n[0]==='name') return n[1];
            return n[0] + n[1];
        });
    const vals = [];
    for(let exp of resultExps){
        combineArray(vals, parseVarible(exp));
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