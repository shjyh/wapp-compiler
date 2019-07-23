import del from 'del';
import glob from 'glob';
import path from 'path';
import chokidar from 'chokidar';
import { BuildSystem } from './BuildSystem';

export default function run(src: string, dist: string, {
    watch = true, compress = false, env
}: {
    watch?: boolean,
    compress?: boolean,
    env?: {[key: string]: boolean|string}
} = {}){
    del.sync(dist);

    const buildSystem  = new BuildSystem(src, dist, compress, env);

    const globPattern = path.join(src, '**/*');

    if(watch){
        chokidar.watch(globPattern).on('add', p=>{
            buildSystem.insertFile(p)
        }).on('ready', _=>{
            buildSystem.ready();
        })
    }else{
        glob(globPattern, {nodir: true}, function(err, matches){
            if(err){
                console.error(err);
                process.exit(1);
                return;
            }

            for(let f of matches){

            }
        })
    }
}