#!/usr/bin/env node

const path = require('path');
const run = require('./dist/main').default;

run(path.resolve(__dirname, 'demo'), path.resolve(__dirname, 'demo_dist'), {
    watch: true, compress: false, env: { DEBUG: true }
});