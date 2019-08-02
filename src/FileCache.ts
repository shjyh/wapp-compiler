import * as fs from 'fs';
import * as path from 'path';

export default class FileCache {
    private files: {[key: string]: string|Buffer} = {};

    constructor(private dist: string){}

    private isEqual(newContent: string|Buffer, oldContent: string|Buffer){
        if(typeof newContent !== typeof oldContent) return false;
        if(!Buffer.isBuffer(newContent)){
            return newContent === oldContent;
        }
        
        return newContent.compare(oldContent as Buffer)===0;
    }
    setFiles(files: {[key: string]: string|Buffer}){
        const oldKeys = Object.keys(this.files);
        const newKeys = Object.keys(files);

        const removedKeys = oldKeys.filter(f=>!newKeys.includes(f));
        const changedKeys: string[] = [];

        for(let key of newKeys){
            if(!this.files[key]) changedKeys.push(key);
            else if(!this.isEqual(files[key], this.files[key])) changedKeys.push(key);
        }

        this.files = files;
        this.write(changedKeys, removedKeys);
    }

    private write(changedKeys: string[], removedKeys: string[]){
        for(let key of changedKeys){
            const realFilePath = path.resolve(this.dist, key);
            fs.promises.mkdir(path.dirname(realFilePath), {recursive: true}).then(r=>{
                return fs.promises.writeFile(realFilePath, this.files[key], {encoding: 'UTF8'})
            }).catch(e=>{
                console.error(e);
                return Promise.reject(e);
            })
        }
        for(let key of removedKeys){
            const realFilePath = path.resolve(this.dist, key);
            fs.promises.mkdir(path.dirname(realFilePath), {recursive: true}).then(r=>{
                return fs.promises.unlink(realFilePath);
            }).catch(e=>{
                console.error(e);
                return Promise.reject(e);
            })
        }
    }
}