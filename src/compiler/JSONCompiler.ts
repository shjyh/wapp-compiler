import Compiler, { CompileResult } from './Compiler';
import * as JSON5 from 'json5';

export default class JSONCompiler implements Compiler {
    private minifyJson: string = '';
    private jsonObj: any = null;

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
            this.jsonObj = JSON5.parse(this.content);
            this.minifyJson = JSON.stringify(this.jsonObj);
        }catch(e){
            this.error = new Error('Error: /<srcDir>/' + this.path + ':\n' + e.message);
        }
    }
    getJsonObj(){
        return this.jsonObj;
    }
    getResult(): CompileResult<string> {
        return { [this.path]: this.minifyJson };
    }
    getLastError(): Error {
        return this.error;
    }

    
}