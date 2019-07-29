import * as path from 'path';

import Compiler from './compiler/Compiler';
import TsCompiler from './compiler/TsCompiler'
import JSONCompiler from './compiler/JSONCompiler'
import SassCompiler from './compiler/SassCompiler'
import SFCCompiler from './compiler/SFCCompiler'
import ResourceCompiler from './compiler/ResourceCompiler';
import PugCompiler from './compiler/PugCompiler';
import SvgCompiler from './compiler/SvgCompiler'
import getBabelConfig from './compiler/babel.config';
import FileCache from './FileCache';
import * as fs from 'fs';

import chalk from 'chalk';
import ora from 'ora';
import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import PrettyError from 'pretty-error';

const pe = new PrettyError();

import debounce from 'lodash/debounce';

function readFileAsString(f: string): string{
    return fs.readFileSync(f, {encoding: 'UTF8'}).toString();
}
function readFileAsBuffer(f: string): Buffer{
    return fs.readFileSync(f);
}

function arrayRemove(arr: any[], item: any){
    const index = arr.indexOf(item);
    if(index !== -1){
        arr.splice(index, 1);
    }
}

function removeCompiler<D extends string|Buffer, T extends Compiler<D>>(compilers: T[], p: string, cb?: (c: T)=>void){
    const compilerIndex = compilers.findIndex(c=>c.is(p))
    if(compilerIndex !== -1){
        if(cb) cb(compilers[compilerIndex]);
        compilers.splice(compilerIndex, 1);
    }
}

function setCompilerContent<D extends string|Buffer, T extends Compiler<D>>(compilers: T[], p: string, content: D){
    const compiler = compilers.find(c=>c.is(p));
    if(!compiler) return;
    compiler.setContent(content);
}

function unwrapext(p: string){
    return path.join(path.dirname(p), path.basename(p, path.extname(p)));
}

export class BuildSystem {
    private fileSystem: FileCache;
    private spinner: ora.Ora;

    private npmlibjs: string;

    private isReadDone = false;
    private npmModules: string [] = [];

    private tsCompilers: TsCompiler[] = [];
    private pugCompilers: PugCompiler[] = [];
    private sassCompilers: SassCompiler[] = [];
    private sfcCompilers: SFCCompiler[] = [];
    private jsonCompilers: JSONCompiler[] = [];
    private appJsonCompiler: JSONCompiler = null;
    private resourceCompilers: ResourceCompiler[] = [];

    private pages: string[] = [];

    private get subPackages(): string[]{
        if(!this.appJsonCompiler) return [];
        const appJson = this.appJsonCompiler.getJsonObj();
        if(!appJson) return [];

        return (appJson.subPackages||[]).map(p=>p.root);
    }

    constructor(
        private src: string, private dist: string, 
        private compress: boolean,
        private env: {[key: string]: boolean|string},
        private watch: boolean,
        private wrapperPath: string
    ){
        this.fileSystem = new FileCache(this.dist);

        //.tmp/lib.js文件，用于webpack
        this.npmlibjs = path.join(this.src, '.tmp/lib.js');
        fs.mkdirSync(path.dirname(this.npmlibjs), { recursive: true });

        if(this.watch){
            fs.writeFileSync(this.npmlibjs, '');
            this.startWebpack();
        }

        this.log('正在扫描工程文件...', 'warn');
        this.spinner = ora();
    }

    private log(txt: string, type: 'warn'|'error'|'log' = 'log'){
        const now = new Date();
        const hour = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');

        switch(type){
            case 'warn':
                txt = chalk.yellow(txt);
                break;
            case 'error':
                txt = chalk.red(txt);
                break;
            case 'log':
                txt = chalk.blueBright(txt);
                break;
        }
        
        console.log(chalk.green(`[${hour}:${minutes}:${seconds}] `), txt);
    }

    addFile(f: string){
        if(this.isReadDone){
            this.log('新增文件编译解析：' + f);
        }else{
            if(!this.spinner.isSpinning) this.spinner.start();
            this.spinner.text = '正在解析编译文件: ' + f;
        }

        const srcRelativePath = path.relative(this.src, f);
        const extname = path.extname(srcRelativePath);
        switch(extname){
            case '.ts': case '.js': case '.wxs':
                if(srcRelativePath.endsWith('.d.ts')) break;
                this.tsCompilers.push(new TsCompiler(
                    srcRelativePath,  readFileAsString(f), this.npmModules, 
                    srcRelativePath.endsWith('.min.js') ? false : this.compress, 
                    this.env,
                    // functional-pages文件夹下文件和.wxs文件不要转译
                    srcRelativePath.includes('functional-pages/')||extname==='.wxs'||srcRelativePath.endsWith('.min.js')
                ));
                break;
            case '.wxml':
                this.pugCompilers.push(new PugCompiler(
                    this.src, srcRelativePath, readFileAsString(f)
                ));
                break;
            case '.wxss':
                this.sassCompilers.push(new SassCompiler(
                    this.src, srcRelativePath, readFileAsString(f)
                ));
                break;
            case '.vue':
                {
                    const compiler = new SFCCompiler(
                        this.src, srcRelativePath, readFileAsString(f), this.npmModules, this.compress, this.env, this.wrapperPath
                    );
                    if(compiler.isPage) this.pages.push(unwrapext(srcRelativePath));
                    this.sfcCompilers.push(compiler);
                }
                break;
            case '.json':
                {
                    const compiler = new JSONCompiler(srcRelativePath, readFileAsString(f));
                    if(srcRelativePath==='app.json') this.appJsonCompiler = compiler;
                    else this.jsonCompilers.push(compiler);
                }
                break;
            case '.svg':
                this.resourceCompilers.push(new SvgCompiler(srcRelativePath, readFileAsString(f)));
                break;
            case '.png': case '.jpg': case '.gif':
                this.resourceCompilers.push(new ResourceCompiler(srcRelativePath, readFileAsBuffer(f)));
                break;
        }
        if(this.isReadDone) this.buildDebounce();
    }
    unlinkFile(f: string){
        this.log('移除文件: ' + f)

        const srcRelativePath = path.relative(this.src, f);
        const extname = path.extname(srcRelativePath);
        switch(extname){
            case '.ts': case '.js': case '.wxs':
                if(srcRelativePath.endsWith('.d.ts')) break;
                removeCompiler(this.tsCompilers, srcRelativePath);
                break;
            case '.wxml':
                removeCompiler(this.pugCompilers, srcRelativePath);
                break;
            case '.wxss':
                removeCompiler(this.sassCompilers, srcRelativePath);
                break;
            case '.vue':
                removeCompiler(this.sfcCompilers, srcRelativePath, c=>{
                    if(c.isPage) arrayRemove(this.pages, unwrapext(srcRelativePath));
                });
                break;
            case '.json':
                if(srcRelativePath==='app.json') this.appJsonCompiler = null;
                else removeCompiler(this.jsonCompilers, srcRelativePath);
                break;
            case '.svg': case '.png': case '.jpg': case '.gif':
                removeCompiler(this.resourceCompilers, srcRelativePath);
                break;
        }
        if(this.isReadDone) this.buildDebounce();
    }
    changeFile(f: string){
        this.log('更新文件重新编译: ' + f);

        const srcRelativePath = path.relative(this.src, f);
        const extname = path.extname(srcRelativePath);
        switch(extname){
            case '.ts': case '.js': case '.wxs':
                if(srcRelativePath.endsWith('.d.ts')) break;
                setCompilerContent(this.tsCompilers, srcRelativePath, readFileAsString(f));
                break;
            case '.wxml':
                setCompilerContent(this.pugCompilers, srcRelativePath, readFileAsString(f));
                break;
            case '.wxss':
                setCompilerContent(this.sassCompilers, srcRelativePath, readFileAsString(f));
                break;
            case '.vue':
                setCompilerContent(this.sfcCompilers, srcRelativePath, readFileAsString(f));
                break;
            case '.json':
                if(srcRelativePath === 'app.json') this.appJsonCompiler.setContent(readFileAsString(f));
                else setCompilerContent(this.jsonCompilers, srcRelativePath, readFileAsString(f));
                break;
            case '.svg': case '.png': case '.jpg': case '.gif':
                setCompilerContent(
                    this.resourceCompilers, srcRelativePath, 
                    extname === '.svg' ? readFileAsString(f): readFileAsBuffer(f)
                )
                break;
        }
        if(this.isReadDone){
            this.buildDebounce();
        }
    }
    ready(){
        this.isReadDone = true;
        this.build();
        if(this.watch) this.log('监听文件中', 'error');
    }

    startWebpack(){
        let preHash = '';
        const completeCallback: webpack.ICompiler.Handler = (err, stats) => {
            if(err){
                console.log(pe.render(err));
                return;
            }

            if(stats.compilation.modules.length<=1) return;
            if(stats.hash === preHash) return;
            preHash = stats.hash;
            this.log('npm包构建完成 ' + chalk.yellow('hash: ' + stats.hash));
        }
        const compiler = webpack({
            entry: {
                'lib': this.npmlibjs
            },
            module: {
                rules: [
                    {
                        test: /regenerator-runtime\/runtime\.js/,
                        loader: path.resolve(__dirname, '../regenerator-loader')
                    },
                    {
                        test: /\.ts$/,
                        loader: 'babel-loader',
                        options: getBabelConfig()
                    }
                ]
            },
            output: {
                path: this.dist,
                filename: '[name].js',
                libraryTarget: 'commonjs2'
            },
            mode: 'production',
            devtool: false,
            stats: {
                maxModules: 0
            },
            target: 'node',
            optimization: {
                minimizer: [
                    new TerserPlugin({terserOptions: {
                        output: {
                            comments: false
                        }
                    }})
                ]
            },
            resolve: {
                extensions: ['.ts', '.js']
            }
        });
        if(this.watch){
            compiler.watch({
                ignored: /node_modules/
            }, completeCallback);
        }else{
            compiler.run(completeCallback)
        }

    }
    private buildDebounce(){
        const debounceFn = debounce(()=>{
            this.build()
        }, 500);
        this.buildDebounce = debounceFn;
        debounceFn();
    }
    private build(){
        this.spinner.stop();
        
        this.log('链接资源', 'warn');

        Promise.all(
            this.resourceCompilers.filter(c=>{
                if((c as SvgCompiler).ready) return c
            }).map(c=>(c as SvgCompiler).ready)
        ).then(()=>{
            if(this.appJsonCompiler&&this.appJsonCompiler.getLastError()){
                console.log(pe.render(this.appJsonCompiler.getLastError()))
                return;
            }
            for(let c of [
                ...this.tsCompilers, 
                ...this.pugCompilers, 
                ...this.sassCompilers,
                ...this.sfcCompilers,
                ...this.jsonCompilers,
                ...this.resourceCompilers
            ]){
                if(c.getLastError()){
                    console.log(pe.render(c.getLastError()))
                    return;
                }
            }

            const files: {[key: string]: string|Buffer} = {};
            const imageManifest = this.getImageManifest();
            
            //生成app.json
            if(this.appJsonCompiler){
                const appJson = this.appJsonCompiler.getJsonObj();
                this.pages.forEach(p=>this.insertPageIntoAppJson(
                    appJson, p
                ));
                delete appJson.main;
                files['app.json'] = JSON.stringify(appJson);
            }

            for(let c of [...this.tsCompilers, ...this.sassCompilers, ...this.jsonCompilers]){
                Object.assign(files, c.getResult());
            }
            for(let c of [...this.pugCompilers, ...this.sfcCompilers, ...this.resourceCompilers]){
                Object.assign(files, c.getResult(imageManifest));
            }
            
            if(this.watch){
                fs.writeFile(this.npmlibjs, this.getLibCode(), err=>{
                    if(err) console.log(err);
                });
            }else{
                fs.writeFileSync(this.npmlibjs, this.getLibCode());
                this.startWebpack();
            }
            this.log('写入文件', 'warn');
            this.fileSystem.setFiles(files);
        }).catch(e=>{
            console.log(pe.render(e));
        });
    }
    private insertPageIntoAppJson(appJson, page: string){
        if(!appJson.pages) appJson.pages = [];
        if(appJson.subPackages){
            for(let subPackage of appJson.subPackages){
                if(!subPackage.pages) subPackage.pages = [];
                if(page.startsWith(subPackage.root)){
                    subPackage.pages.push(path.relative(subPackage.root, page));
                    continue;
                }
            }
        }
        if(page===appJson.main) appJson.pages.unshift(page)
        else appJson.pages.push(page);
    }
    private getImageManifest(){
        const subPackages = this.subPackages
        const imageManifest = {};
        for(let c of [...this.pugCompilers, ...this.sfcCompilers]){
            const images = c.getImages();
            const subpackage = c.matchSubpackage(subPackages);

            for(let image of images){
                //root module
                if(imageManifest[image] === ('images/' + image)) continue;
                if(!subPackages||!imageManifest[image]){
                    imageManifest[image] = ('images/' + image);
                    continue;
                }

                const thisSubPackageImagePath = 'images/' + path.join(subpackage, image);
                if(imageManifest[image]!==thisSubPackageImagePath){
                    imageManifest[image] = image;
                }
            }
        }
        return imageManifest;
    }
    private getLibCode(){
return `
self = function () {
    return this;
}();
function resolveGlobal(global) {
    if (self) return self;
    if(global.Math&&global.Array&&global.Date&&global.RegExp) return global;
    
    if (typeof Promise !== 'undefined') global.Promise = Promise;
    if (typeof Symbol !== 'undefined') global.Symbol = Symbol;
    if (typeof WeakMap !== 'undefined') global.WeakMap = WeakMap;
    if (typeof WeakSet !== 'undefined') global.WeakSet = WeakSet;
    if (typeof Map !== 'undefined') global.Map = Map;
    if (typeof Set !== 'undefined') global.Set = Set;
    if (typeof Proxy !== 'undefined') global.Proxy = Proxy;
    if (typeof Reflect !== 'undefined') global.Reflect = Reflect;
    if (typeof ArrayBuffer !== 'undefined') global.ArrayBuffer = ArrayBuffer;
    if (typeof setImmediate !== 'undefined'){
        global.setImmediate = setImmediate;
        global.clearImmediate = clearImmediate;
    }
    if(typeof nextTick !== 'undefined') global.nextTick = nextTick;

    Object.assign(global, {
        Array, Number, JSON, Math, Object, Date, RegExp, String, Boolean,
        parseFloat, parseInt, setTimeout, clearTimeout, setInterval, clearInterval,
        isNaN, NaN, isFinite, encodeURI, encodeURIComponent, decodeURI, decodeURIComponent,
        Error, SyntaxError, TypeError, ReferenceError, RangeError
    })
    
    return global;
};
self=global=resolveGlobal(global);
module.exports = {
    c: require('@zouke/wapp-lib/wrapper/CreateWrapperComponent').default,
    p: require('@zouke/wapp-lib/wrapper/CreateWrapperPage').default,
    n: [
        ${this.npmModules.map(n=>`require('${n}')`).join(',')}
    ]
};
`;
    }
    
}