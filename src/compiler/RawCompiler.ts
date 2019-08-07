import Compiler, { CompileResult } from './Compiler';

export default class RawCompiler implements Compiler {
    constructor(protected path: string, protected content: string){
    }
    is(path: string): boolean {
        return this.path === path;
    }    
    setContent(content: string): void {
        this.content = content;
    }
    getResult(): CompileResult {
        return {[this.path]: this.content};
    }
    getLastError(): Error {
        return null;
    }

    
}