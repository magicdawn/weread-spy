/**
 * 如果使用 ts-node
 * 开发使用 __dirname + /index.worker.js
 * 内容是 require ts-node/register + require index.worker.ts
 *
 * ts 编译后,
 * ./index.worker.ts -> dist/index.worker.js
 * ./index.worker.js 不参与 ts 编译
 *
 * esbuild bundle 后
 */

// const workerFile = process.env.ESBUILD_BUNDLE
//   ? __dirname + '/processContent.worker.js'
//   : __dirname + '/index.worker.js'
