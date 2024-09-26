import { TransformOptions } from "@babel/core";

export default function(modules: "amd"|"umd"|"systemjs"|"commonjs"|"cjs"|"auto"|false = 'cjs', filename?: string): TransformOptions{
    return Object.assign(filename?{
        filename,
        configFile: false,
        sourceMaps: 'inline' as TransformOptions["sourceMaps"],
    }:{}, {
        presets: [
            [
                "@babel/preset-env",
                {
                    modules
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
            ...(modules==='cjs'||modules==='commonjs'?[
                [
                    "@babel/plugin-transform-modules-commonjs",
                    {
                        strict: false
                    }
                ]
            ]:[]),
            [
                "@babel/plugin-transform-runtime",
                {
                    "corejs": 3
                }
            ],
            ["@babel/plugin-proposal-decorators", { legacy: true }],
            "@babel/plugin-syntax-class-properties",
            ["@babel/plugin-proposal-class-properties", { "loose": true }],
            ["@babel/plugin-transform-private-methods", { "loose": true }],
            ["@babel/plugin-transform-private-property-in-object", { "loose": true }]
        ]
    });
}