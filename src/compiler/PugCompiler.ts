import Compiler, { CompileResult } from './Compiler';
import WatchItem from './WatchItem';
import parse from 'pug-parser';
import lex from 'pug-lexer';
import load from 'pug-load';
import link from 'pug-linker';
import generateCode from 'pug-code-gen';
import stripComments from 'pug-strip-comments';
import runtimeWrapper from 'pug-runtime/wrap';

import stripIndent from 'strip-indent';

import parseAst from './parseAst';

export default class PugCompiler implements Compiler{
    private xmlGenFn: (locals) => string;
    private error: Error = null;

    private watchItems: WatchItem[] = [];
    private methods: string[] = [];
    private images: string[] = [];
    private vImages: string[] = [];
    
    constructor(
        private src: string,
        private path: string, private content: string
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
        try{
            this.content = stripIndent(this.content);
            const ast = link(load.string(this.content, {
                filename: this.path,
                lex, parse(tokens, options){
                    return parse(stripComments(tokens, options), options);
                }, basedir: this.src
            }));
            
            this.parseAst(ast);

            this.xmlGenFn = runtimeWrapper(generateCode(ast));
        }catch(e){
             this.error = new Error('Error: /<srcDir>/' + this.path + ':\n' + e.message);
        }
    }

    private parseAst(ast){
        const result = parseAst(ast);
        this.watchItems = result.watchItems;
        this.images = result.images;
        this.methods = result.methods;
        this.vImages = result.vImages;
    }

    getMethods(){
        return this.methods;
    }
    
    getWatchItems(){
        return this.watchItems;
    }
    getImages(){
        return this.images;
    }
    getVImages(){
        return this.vImages;
    }

    matchSubpackage(subpackages: string[]): string {
        for(let pack of subpackages){
            if(this.path.startsWith(pack + '/')) return pack;
        }
        return null;
    }
    getResult(imageMap: {[key: string]: string}): CompileResult<string> {
        return {[this.path]: this.xmlGenFn({
            images: imageMap
        })};
    }
    getLastError(): Error {
        return this.error;
    }
}