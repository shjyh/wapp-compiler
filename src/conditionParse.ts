"use strict";

function parse(source: string, defs: {[key: string]: string|boolean}): string{
    if(!defs) defs = {};

    const lines = source.split('\n');
    const listVarName = '__$list$__';
    let codes = [
        `(function(){const ${listVarName} = [];\n`
    ];

    for(let key of Object.keys(defs)){
        codes.push(`const ${key} = ${JSON.stringify(defs[key])};\n`);
    }
    for(let line of lines){
        const checkResult = checkLine(line);
        if(checkResult){
            switch(checkResult.condition){
                case 'if':
                    codes.push(`if(${checkResult.expr}){\n`);
                    break;
                case 'else':
                    codes.push('}else{\n');
                    break;
                case 'elif':
                    codes.push(`}else if(${checkResult.expr}){\n`);
                    break;
                case 'endif':
                    codes.push('}\n');
                    break;
            }
        }else{
            codes.push(`${listVarName}.push(${JSON.stringify(line)});\n`);
        }
    }
    codes.push( `return ${listVarName};})();`);

    try{
        const result = eval(codes.join(''));
        return result.join('\n');
    }catch(e){
        throw new Error('error condition');
    }
}

interface ConditionToken{
    condition: string;
    expr: string
}

function checkLine(line: string): ConditionToken | false{
    const matchResult = line.match(/\/{3,}[\s]*#(if|else|elif|endif)([\s]+[\s\S]*)?$/);
    
    if(matchResult){
        const checkResult = {
            condition:matchResult[1], 
            expr:(matchResult[2]||'').trim()
        };
        if(
            (checkResult.condition==='if'||checkResult.condition==='elif')
            &&
            checkResult.expr===''
            ){
                return false;
        }
        return checkResult;
    }
    
    return false;
}

export default parse;
