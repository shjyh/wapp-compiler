import * as fs from 'fs';
import * as path from 'path';

export default class FileCache{
    private filePaths: string[] = [];
    private fileContentMap: {[key: string]: string|Buffer} = {};
    private changedKeys: string[] = [];

    constructor(private dist: string){}

    private setFile(p: string, content: string|Buffer){
        //已更改文件中存在，直接替换内容
        if(this.changedKeys.includes(p)){
            this.fileContentMap[p] = content;
            return;
        }

        //新文件加入
        if(!this.filePaths.includes(p)){
            this.filePaths.push(p);
            this.fileContentMap[p] = content;
            this.changedKeys.push(p);
            this.runCallback();
            return;
        }


        //比对新旧内容，更新已更改文件列表
        const alreadyContent = this.fileContentMap[p];
        let isChanged = false;
        if(typeof content === 'string'){
            if(content!==alreadyContent) isChanged = true;
        }else if(typeof alreadyContent === 'string'){
            isChanged = true;
        }else if( (content!==alreadyContent) && content.compare(alreadyContent)!==0){
            isChanged = true;
        }

        if(!isChanged) return;
        this.fileContentMap[p] = content;
        this.changedKeys.push(p);
        this.runCallback();
    }

    setFiles(files: {[key: string]: string|Buffer}){
        const setKeys = Object.keys(files);
        const removedFileKeys = this.filePaths.filter(f=>!setKeys.includes(f));
        
        for(let sk of setKeys){
            this.setFile(sk, files[sk]);
        }
        for(let rk of removedFileKeys){
            this.setFile(rk, null);
        }
    }

    private getFile(p: string): string|Buffer{
        return this.fileContentMap[p];
    }

    private hasTickSchedular = false;
    private runCallback(){
        if(this.hasTickSchedular) return;
        this.hasTickSchedular = true;

        process.nextTick(()=>{
            this.hasTickSchedular = false;
            
            for(let key of this.changedKeys){
                const realFilePath = path.resolve(this.dist, key);
                fs.promises.mkdir(path.dirname(realFilePath), {recursive: true}).then(r=>{
                    const fileContent = this.getFile(key);
                    if(fileContent===null){
                        return fs.promises.unlink(realFilePath);
                    }else{
                        return fs.promises.writeFile(realFilePath, fileContent, {encoding: 'UTF8'});
                    }
                }).catch(e=>{
                    console.error(e);
                    return Promise.reject(e);
                })
            }
            this.changedKeys = [];
        })
    }
}