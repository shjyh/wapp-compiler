export default interface Compiler<T extends string|Buffer = string> {
    is(path: string): boolean;
    setContent(content: T): void;
    getResult(opt?: any): CompileResult<T>;
    getLastError(): Error;
}

export type CompileResult<T extends string|Buffer = string> = {[key: string]: T};