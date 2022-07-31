# weread-spy

> 使用微信读书 Web 版生成 ePub 电子书 (需要无限卡权限, 或已购买的书)

[![npm version](https://img.shields.io/npm/v/weread-spy.svg?style=flat-square)](https://www.npmjs.com/package/weread-spy)
[![npm downloads](https://img.shields.io/npm/dm/weread-spy.svg?style=flat-square)](https://www.npmjs.com/package/weread-spy)
[![npm license](https://img.shields.io/npm/l/weread-spy.svg?style=flat-square)](http://magicdawn.mit-license.org)

## 声明

本项目仅供技术研究使用, 请勿用于商业用途!<br/>
本项目仅供技术研究使用, 请勿用于商业用途!<br/>
本项目仅供技术研究使用, 请勿用于商业用途!<br/>

## 安装

```sh
$ pnpm add weread-spy -g
```

### 或者使用源码

- `git clone` 此项目
- `pnpm i`
- `pnpm link --global`

这样就可以使用 `weread-spy` 命令了

### 一站式操作 `weread-spy one`

- 运行此命令, 会自动打开 puppeteer 浏览器
- 扫码登录
- 浏览自己想下载的书, 返回命令行. 监控到 url 像是一本书, 输入 `y` 开始生成
- 需要安装 `Java`, epub check 依赖 java, 可以认为是 ePub 文件的 lint 工具
- 生成 epub 文件在当前目录下, 或者使用 `weread-spy one -d some-dir` 知道输出目录

数据文件在 `~/Library/Appication Support/weread-spy/` 目录下

### 其他分步的命令

- `weread-spy dl -u <url>` 下载电子书信息
- `weread-spy gen -u <url>` 根据下载的信息, 生成电子书
- `weread-spy check` 跑 epub check

## Changelog

[CHANGELOG.md](CHANGELOG.md)

## License

the MIT License http://magicdawn.mit-license.org
