import * as path from 'path';

export class BuildSystem {
    private src: string;
    private dist: string;
    private isReadDone = false;
    private npmModules: string [] = []
    constructor(
        src: string, dist: string, 
        private compress: boolean,
        private env?: {[key: string]: boolean|string}
    ){
        this.src = path.resolve(src);
        this.dist = path.resolve(dist);
    }
    insertFile(f: string){

    }
    ready(){
        this.isReadDone = true;
    }
}