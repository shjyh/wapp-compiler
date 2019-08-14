import del from 'del';
import glob from 'glob';
import * as path from 'path';
import chokidar from 'chokidar';
import { BuildSystem } from './BuildSystem';

export default function run(src: string, dist: string, {
    watch = true, compress = false, env = null, wrapperPath = null
}: {
    watch?: boolean,
    compress?: boolean,
    env?: {[key: string]: boolean|string},
    wrapperPath?: string     //Page来源文件
} = {}){
    del.sync(dist, {
        force: true
    });

    src = path.resolve(src);
    dist = path.resolve(dist);

    const buildSystem  = new BuildSystem(src, dist, compress, env, watch, wrapperPath);

    const globPatterns = [path.join(src, '**/*'), '!' + path.join(src, '.tmp/**/*')];

    if(watch){
        chokidar.watch(globPatterns).on('add', p=>{
            buildSystem.addFile(p)
        }).on('ready', _=>{
            buildSystem.ready();
        }).on('unlink', p=>{
            buildSystem.unlinkFile(p);
        }).on('change', p=>{
            buildSystem.changeFile(p);
        });
    }else{
        glob('{' + globPatterns.join(',') + '}', {nodir: true}, function(err, matches){
            if(err){
                console.error(err);
                process.exit(1);
                return;
            }

            for(let f of matches){
                buildSystem.addFile(f);
            }
            buildSystem.ready();
        })
    }
}