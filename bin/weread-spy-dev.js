#!/usr/bin/env node

console.warn('[ts-node]: THIS is slow !!!')
require('ts-node').register({scriptMode: true})
require('../src/bin')
