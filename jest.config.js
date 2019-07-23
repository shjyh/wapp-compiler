module.exports = {
    verbose: true,
    setupFiles: [
        "./__tests__/setup.ts"
    ],
    testMatch: [
        "**/__tests__/**/*.test.ts"
    ],
    transformIgnorePatterns: ["<rootDir>/node_modules/(?!(lodash-es))"]
}