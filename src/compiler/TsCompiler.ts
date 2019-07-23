import Compiler, { CompileResult } from "./Compiler";
import { transformSync } from '@babel/core';
import { minify } from 'terser';
import getBabelConfig from './babel.config';
import * as path from 'path';

export default class TsCompiler implements Compiler{
    private transformCode: string = '';
    private error: Error = null;

    constructor(
        private path: string, 
        private content: string, 
        private npmModules: string[],
        private compress: boolean,
        private useRaw: boolean = false
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
            if(!this.useRaw){
                const options =  getBabelConfig('/<srcDir>/' + this.path);
                if(this.compress){
                    options.sourceMaps = false;
                }
                this.transformCode = transformSync(this.content, options).code;
                this.fixNpmPackage();
            }
            if(this.compress){
                this.transformCode = minify(this.transformCode, {
                    output: {
                        comments: false
                    }
                }).code;
            }
        }catch(e){
            this.error = e;
        }
    }

    private fixNpmPackage(){
        let code = this.transformCode;

        const rootRelativePath = path.relative(path.dirname(this.path), '')||'.';
        const libRelativePath = rootRelativePath + '/lib';

        let hasNpmModule = false;
        let split: string[] = [];
        while(true){
            let matchResult = code.match(/require\((['"])([^./]\S*?)\1\)/); //[raw, '", modulename]
            if(!matchResult){
                split.push(code);
                break;
            }
            split.push(code.slice(0, matchResult.index));
            code = code.slice(matchResult.index+matchResult[0].length);

            const moduleName = matchResult[2];
            if(moduleName.startsWith('root/')){
                split.push(`require("${rootRelativePath + moduleName.substr(4)}")`);
                continue;
            }

            hasNpmModule = true;
            if(!this.npmModules.includes(moduleName)){
                this.npmModules.push(moduleName);
            }
            const index = this.npmModules.indexOf(moduleName);
            split.push(`_$lib$_.n[${index}]`);
        }

        if(hasNpmModule){
            const libCode = `var _$lib$_ = require("${libRelativePath}");`;
            if(split[0].startsWith('"use strict";')){
                split[0] = split[0].replace('"use strict";', '"use strict";\n' + libCode)
            }else{
                split.unshift(libCode)
            }
        }
        this.transformCode = split.join('');
    }

    getResult(): CompileResult {
        return { [this.path]: this.transformCode };
    }
    getLastError(){
        return this.error;
    }
}