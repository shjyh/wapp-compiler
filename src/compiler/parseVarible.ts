import jsTokens, { matchToToken } from 'js-tokens';

export default function parse(express: string): string[]{
    const vars = [];
    jsTokens.lastIndex = 0;
    let match = null;

    let bracks = 0;
    let lastName = '';
    while(match=jsTokens.exec(express)){
        const token = matchToToken(match);
        switch(token.type){
            case 'name':
                if(!lastName.endsWith('.')){
                    completeLastName();
                }
                lastName += token.value;
                break;
            case 'punctuator':
                switch(token.value){
                    case '.':
                        lastName += '.';
                        break;
                    case '[':
                        ++bracks;
                        lastName += '[';
                        break;
                    case ']':
                        if(bracks<=0) completeLastName();
                        else{
                            --bracks;
                            lastName += ']';
                        }
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
    if(lastName) vars.push(lastName);

    return vars;

    function completeLastName(){
        if(!lastName) return;
        if(bracks!==0){
            const index = lastName.lastIndexOf('[');
            lastName = lastName.substr(0, index);
        }
        if(!vars.includes(lastName)){
            vars.push(lastName);
        }
        lastName = '';
        bracks = 0;
    }
}