
import SVGO from 'svgo';
import ResourceCompiler from './ResourceCompiler';

const svgo = new SVGO({
    plugins: [
        { 'removeViewBox': false }
    ]
});

export default class SvgCompiler extends ResourceCompiler<string>{
    constructor(path: string, content: string){
        super(path, content);
        this.minifySvg();
    }

    ready: Promise<any> = null;

    setContent(content: string): void{
        super.setContent(content);
        this.minifySvg();
    }

    private minifySvg(){
        this.error = null;
        this.ready = null;
        try{
            this.ready = svgo.optimize(this.content, {
                path: '/<srcDir>/' + this.path
            }).then(result=>{
                this.result = result.data;
            }).catch(e=>{
                this.error = e;
            })
        }catch(e){
            this.error = e;
            this.ready = Promise.resolve();
        }
    }
}