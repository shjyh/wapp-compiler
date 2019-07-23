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

    private raw: boolean = false; //使用原始的Page

    private error: Error = null;
    constructor(
        private src: string, 
        private path: string, 
        private content: string, 
        private npmModules: string[],
        private compress: boolean
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
        try{
            const basePath = path.join(path.dirname(this.path), path.basename(this.path, path.extname(this.path)));

            const configMatch = this.content.match(/<config[\s\S]*?>([\s\S]*?)<\/config>/);
            if(configMatch&&configMatch[1]){
                this.jsonCompiler = new JSONCompiler(basePath + '.json', configMatch[1]);
            }

            const wxssMatch = this.content.match(/<style[\s\S]*?>([\s\S]*?)<\/style>/);
            if(wxssMatch&&wxssMatch[1]){
                this.sassCompiler = new SassCompiler(this.src, basePath + '.wxss', wxssMatch[1]);
            }

            const wxmlMatch = this.content.match(/<template[\s\S]*?>([\s\S]*?)<\/template>/);
            if(wxmlMatch&&wxmlMatch[1]){
                this.pugCompiler = new PugCompiler(this.src, basePath + '.wxml', wxmlMatch[1]);
            }

            const scriptMatch = this.content.match(/<script[\s\S]*\s?(raw)?\s?>([\s\S]*?)<\/script>/);
            if(scriptMatch&&scriptMatch[2]){
                this.raw = scriptMatch[1] === 'raw';
                this.tsCompiler = new TsCompiler(
                    basePath + (this.raw?'':'.factory') +'.js', scriptMatch[2], this.npmModules, this.compress
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
            const watchItems = this.pugCompiler?this.pugCompiler.getWatchItems():[];
            const methods = this.pugCompiler?this.pugCompiler.getMethods():[]

            result[basePath + '.js'] = `require('${libRelativePath}').p(require('./${parsedPath.name}.factory.js'),${
                JSON.stringify(watchItems)},${JSON.stringify(methods)})`;
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

    getLastError(): Error {
        if(this.error) return this.error;
        for(let compiler of [this.jsonCompiler, this.sassCompiler, this.pugCompiler, this.tsCompiler]){
            if(compiler&&compiler.getLastError) return compiler.getLastError();
        }
        return null;
    }
}