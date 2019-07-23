import Compiler, { CompileResult } from './Compiler';
import WatchItem from './WatchItem';
import parse from 'pug-parser';
import lex from 'pug-lexer';
import load from 'pug-load';
import link from 'pug-linker';
import generateCode from 'pug-code-gen';
import stripComments from 'pug-strip-comments';
import runtimeWrapper from 'pug-runtime/wrap';


export default class PugCompiler implements Compiler{
    private xmlGenFn: (locals) => string;
    private error: Error;

    private watchItems: WatchItem[] = [];
    private methods: string[] = [];
    private images: string[] = [];
    
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
        try{
            const ast = link(load.string(this.content, {
                filename: this.path,
                lex, parse(tokens, options){
                    return parse(stripComments(tokens, options), options);
                }, basedir: this.src
            }));
            
            this.parseAst(ast);

            this.xmlGenFn = runtimeWrapper(generateCode(ast));
        }catch(e){
            this.error = e;
        }
    }

    private parseAst(ast){
    }

    getResult(imageMap: {[key: string]: string}): CompileResult<string> {
        return {[this.path]: this.xmlGenFn(imageMap)};
    }
    getLastError(): Error {
        return this.error;
    }

}