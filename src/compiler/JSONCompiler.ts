import Compiler, { CompileResult } from './Compiler';
import * as JSON5 from 'json5';

export default class JSONCompiler implements Compiler {
    private minifyJson: string = '';

    private error: Error = null;
    constructor(private path: string, private content: string){
        this.minify();
    }
    is(path: string): boolean {
        return path === this.path;
    }    
    setContent(content: string): void {
        this.content = content;
        this.minify();
    }

    private minify(){
        this.error = null;
        try{
            this.minifyJson = JSON.stringify(JSON5.parse(this.content));
        }catch(e){
            this.error = new Error('Error: /<srcDir>/' + this.path + ':\n' + e.message);
        }
    }
    getJsonObj(){
        return JSON5.parse(this.content);
    }
    getResult(): CompileResult<string> {
        return { [this.path]: this.minifyJson };
    }
    getLastError(): Error {
        return this.error;
    }

    
}