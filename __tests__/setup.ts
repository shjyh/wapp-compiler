interface Console {
    logg: typeof console.log
}

global.console.logg = console.log;

global.console.log = jest.fn();
global.console.warn = jest.fn();



