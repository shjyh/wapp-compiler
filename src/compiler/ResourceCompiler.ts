import Compiler, { CompileResult } from './Compiler';
import * as path from 'path';

export default class ResourceCompiler<T extends string|Buffer = string|Buffer> implements Compiler<T> {
    protected error: Error = null;
    protected result: T = null;

    constructor(protected path: string, protected content: T){
        this.result = content;
    }
    is(path: string): boolean {
        return this.path === path;
    }    
    setContent(content: T): void {
        this.content = content;
        this.result = content;
    }
    getResult(imageMap: {[key: string]: string}): CompileResult<T> {
        const dist = imageMap[this.path];
        if(!dist) return {};
        return {
            [path.resolve(dist, this.path)]: this.result
        };
    }
    getLastError(): Error {
        return this.error;
    }

    
}