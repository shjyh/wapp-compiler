
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
    c: require('@zouke/wapp-lib/wrapper/CreateWrapperComponent'),
    p: require('@zouke/wapp-lib/wrapper/CreateWrapperPage'),
    n: [
        require('@babel/runtime-corejs3/core-js-stable/object/define-property'),require('@zouke/wapp-lib/make')
    ]
};
