import Compiler, { CompileResult } from "./Compiler";
import JSONCompiler from './JSONCompiler';
import PugCompiler from './PugCompiler';
import SassCompiler from './SassCompiler';
import TsCompiler from './TsCompiler';

import * as path from 'path';

export default class SFCCompiler implements Compiler{
    private sassCompiler: SassCompiler = null;
    private tsCompiler: TsCompiler = null;
    private pugCompiler: PugCompiler = null;
    private jsonCompiler: JSONCompiler = null;

    private _isPage: boolean = true;
    get isPage(){ return this._isPage; }

    private raw: boolean = false; //使用原始的Page

    private error: Error = null;
    constructor(
        private src: string, 
        private path: string, 
        private content: string, 
        private npmModules: string[],
        private compress: boolean,
        private env: {[key: string]: boolean|string},
        private wrapperPath: string
    ){
        this.compile();
    }
    is(path: string): boolean {
        return this.path === path;
    }    
    setContent(content: string): void {
        this.content = content;
        this.compile();
    }

    private compile(){
        this.error = null;
        this.jsonCompiler = this.sassCompiler = this.pugCompiler = this.tsCompiler = null;
        this._isPage = true;
        try{
            const basePath = path.join(path.dirname(this.path), path.basename(this.path, path.extname(this.path)));

            const configMatch = this.content.match(/<config[\s\S]*?>([\s\S]*?)<\/config>/);
            if(configMatch&&configMatch[1]&&configMatch[1].trim()){
                this.jsonCompiler = new JSONCompiler(basePath + '.json', configMatch[1]);

                if(!this.jsonCompiler.getLastError()&&this.jsonCompiler.getJsonObj().component) this._isPage = false;
            }

            const wxssMatch = this.content.match(/<style[\s\S]*?>([\s\S]*?)<\/style>/);
            if(wxssMatch&&wxssMatch[1]&&wxssMatch[1].trim()){
                this.sassCompiler = new SassCompiler(this.src, basePath + '.wxss', wxssMatch[1]);
            }

            const wxmlMatch = this.content.match(/<template[\s\S]*?>([\s\S]*?)<\/template>/);
            if(wxmlMatch&&wxmlMatch[1]){
                this.pugCompiler = new PugCompiler(this.src, basePath + '.wxml', wxmlMatch[1]);
            }

            const scriptMatch = this.content.match(/<script[\s\S]*?(raw)?\s?>([\s\S]*?)<\/script>/);
            if(scriptMatch&&scriptMatch[2]){
                this.raw = scriptMatch[1] === 'raw';
                this.tsCompiler = new TsCompiler(
                    basePath + (this.raw?'':'.factory') +'.ts', scriptMatch[2], this.npmModules, this.compress, this.env
                )
            };
        }catch(e){
            this.error = e;
        }
    }

    getResult(imageMap: {[key: string]: string}): CompileResult {
        const result = {};
        if(!this.raw&&this.tsCompiler){
            const rootRelativePath = path.relative(path.dirname(this.path), '')||'.';
            const libRelativePath = rootRelativePath + '/lib';
            const parsedPath: path.ParsedPath = path.parse(this.path);
            const basePath = path.join(path.dirname(this.path), path.basename(this.path, parsedPath.ext));
            const methods = this.pugCompiler?this.pugCompiler.getMethods():[];
            const vImageMap: {[key: string]: string} = {};
            (this.pugCompiler?this.pugCompiler.getVImages():[]).forEach(s=>{
                vImageMap[s] = '/' + imageMap[s];
            })
            const hasVImages = Object.keys(vImageMap).length;
            let watchItems = (this.pugCompiler?this.pugCompiler.getWatchItems():[]);
            if(hasVImages){
                watchItems = watchItems.filter(w=>w!=='$images'); 
            }

            let genCode = [];
            if(this.wrapperPath){
                genCode.push(`require('${rootRelativePath}/${this.wrapperPath}').`);
                genCode.push(this.isPage?'wp':'wc');
            }else{
                genCode.push(`require('${libRelativePath}').`);
                genCode.push(this.isPage?'p(Page)':'c(Component)');
            }
            genCode.push(`(require('./${parsedPath.name}.factory.js').default,${JSON.stringify(watchItems)},${JSON.stringify(methods)}${
                hasVImages?`,${JSON.stringify(vImageMap)}`:''
            });`);
            result[basePath + '.js'] = genCode.join('');
        }

        if(this.jsonCompiler) Object.assign(result, this.jsonCompiler.getResult());
        if(this.sassCompiler) Object.assign(result, this.sassCompiler.getResult());
        if(this.pugCompiler) Object.assign(result, this.pugCompiler.getResult(imageMap));
        if(this.tsCompiler) Object.assign(result, this.tsCompiler.getResult());

        return result;
    }

    getImages(): string[]{
        if(!this.pugCompiler) return []
        return this.pugCompiler.getImages();
    }

    matchSubpackage(subpackages: string[]): string {
        for(let pack of subpackages){
            if(this.path.startsWith(pack)) return pack;
        }
        return null;
    }

    getLastError(): Error {
        if(this.error) return this.error;
        for(let compiler of [this.jsonCompiler, this.sassCompiler, this.pugCompiler, this.tsCompiler]){
            if(compiler&&compiler.getLastError()) return compiler.getLastError();
        }
        return null;
    }
}