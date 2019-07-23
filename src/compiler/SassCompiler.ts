import Compiler, { CompileResult } from "./Compiler";
import * as sass from 'sass';
import * as path from 'path';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import * as csso from 'csso';

const postcssRender = postcss([autoprefixer])

export default class SassCompiler implements Compiler{
    private transformCode: string ='';
    private error: Error = null;

    constructor(
        private src: string,
        private path: string,
        private content: string
    ){
        this.compile();
    }
    is(path: string): boolean {
        return path === this.path;
    }
    setContent(content: string): void {
        this.content = content;
        this.compile();
    }
    
    private compile(){
        this.error = null;
        try{
            this.transformCode = csso.minify(postcssRender.process(sass.renderSync({
                data: this.content,
                includePaths: [this.src, path.join(this.src, this.path)]
            }).css).css, {
                comments: false
            }).css.replace(/\@import\s+url\((.+?)\)/g, '@import \'$1\'');
        }catch(e){
            this.error = new Error('Error: /<srcDir>/' + this.path + ':\n' + e.message);
        }
    } 
    getResult(): CompileResult {
        return { [this.path]: this.transformCode };
    }
    getLastError(): Error {
        return this.error;
    }
}