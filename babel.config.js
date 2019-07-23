module.exports = function(api){
    api.cache(true);
    
    return {
        presets: [
            [
                "@babel/preset-env",
                {
                    targets: {
                        node: 'current'
                    },
                    modules: 'cjs'
                }
            ],
            "@babel/preset-typescript"
        ],
        "plugins": [
            [
                "@babel/plugin-transform-runtime",
                {
                    "corejs": 3
                }
            ],
            ["@babel/plugin-proposal-decorators", { legacy: true }],
            "@babel/plugin-syntax-class-properties",
            ["@babel/plugin-proposal-class-properties", { "loose": true }]
        ]
    }    
}