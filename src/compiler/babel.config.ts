import { TransformOptions } from "@babel/core";

export default function(filename: string): TransformOptions{
    return Object.assign(filename?{
        filename,
        configFile: false,
        sourceMaps: 'inline',
    }:{}, {
        presets: [
            [
                "@babel/preset-env",
                {
                    modules: 'cjs'
                }
            ],
            [
                "@babel/preset-typescript",
                {
                    allExtensions: true
                }
            ]
        ],
        plugins: [
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
    });
}