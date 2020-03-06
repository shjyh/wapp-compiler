import jsTokens, { matchToToken } from 'js-tokens';

export default function parse(express: string): string[]{
    express = express.trim();
    if(!express) return [];
    
    const vars = [];
    jsTokens.lastIndex = 0;
    let match = null;

    let bracks = 0;
    let lastName = '';
    while(match=jsTokens.exec(express)){
        const token = matchToToken(match);
        switch(token.type){
            case 'name':
                if(['undefined', 'null', 'true', 'false'].includes(token.value)){
                    if(lastName.endsWith(".")||lastName.endsWith("[")){
                        lastName += token.value;
                    }else{
                        completeLastName();
                    }
                    break;
                }
                if(!lastName.endsWith('.')){
                    completeLastName();
                }
                lastName += token.value;
                break;
            case 'punctuator':
                switch(token.value){
                    case '.':
                        if(lastName) lastName += '.';
                        break;
                    case '[':
                        if(lastName){
                            ++bracks;
                            lastName += '[';
                        }
                        break;
                    case ']':
                        if(bracks<=0) completeLastName();
                        else{
                            --bracks;
                            lastName += ']';
                        }
                        break;
                    case '(': //函数调用
                        lastName = '';
                        bracks = 0;
                        break;
                    default:
                        completeLastName();
                        break;
                }
                break;
            case 'number': case 'string':
                if(lastName.endsWith('[')){
                    lastName += token.value;
                }else{
                    completeLastName();
                }
                break;
            default: 
                completeLastName();
                break;
                
        }
    }

    completeLastName();

    return vars;

    function completeLastName(){
        if(!lastName) return;
        if(bracks!==0){
            const index = lastName.lastIndexOf('[');
            lastName = lastName.substr(0, index);
            if(!lastName) return;
        }
        if(lastName==='true'||lastName==='false') return;
        if(!vars.includes(lastName)){
            vars.push(lastName);
        }
        lastName = '';
        bracks = 0;
    }
}