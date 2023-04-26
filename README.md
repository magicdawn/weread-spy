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

## epub 规范 & 阅读器

- 本项目使用 ePub v3 规范, 且使用 epubcheck lint, 如果有 lint 报错的地方, 请添加 issue
- ePub 阅读器推荐 `Koodo Reader` or `Apple Books`

## 一站式操作 `weread-spy one`

- 运行此命令, 会自动打开 puppeteer 浏览器
- 扫码登录
- 浏览自己想下载的书, 返回命令行. 监控到 url 像是一本书, 输入 `y` 开始生成

### 注意事项

- 需要安装 `Java`, epub check 依赖 java, 可以认为是 ePub 文件的 lint 工具
- 数据文件在 `~/Library/Appication Support/weread-spy/` 目录下
- 生成 epub 文件在当前目录下, 或者使用 `weread-spy one -d some-dir` 指定输出目录

#### Options

| flag         | desc                   | default |
| ------------ | ---------------------- | ------- |
| `-d,--dir`   | 最终 ePub 文件输出目录 | pwd     |
| `--interval` | 切换章节间隔, 毫秒     | 0       |

## 其他分步的命令

- `weread-spy dl -u <url>` 下载电子书信息
- `weread-spy gen -u <url>` 根据下载的信息, 生成电子书
- `weread-spy check` 跑 epub check

## 更新日志

### v0.5.1 2023-04-26

- 清理更多没有使用的依赖

### v0.5.0 2023-04-26

- 添加 `weread-spy info` 命令
- 添加 `DEBUG_PROCESS_CONTENT=1` 支持, 不开启 workers process content
- 添加 `weread-spy gen -D/--debug/--decompress <book-id-or-url-or-title>`, `-D` 解压缩 `.ePub` 文件, 方便 debug
- 修复 cheerio, xml + cjk + pre/code 的处理, see https://github.com/cheeriojs/cheerio/issues/1198
- 移除 gulp, 移除 globby, 直接用 fast-glob 更好

### v0.4.0 2023-03-15

- 修复 htchapterContentHtml 抓取

### v0.3.0 2022-12-25

- 强制打开微信读书 `__vue__` 属性的使用

### v0.2.0 2022-09-03

- `one` / `dl` 命令新增 `--interval <毫秒数>` 切换章节间隔

### v0.1.1 2022-07-09

- map.json 结构调整, 数据文件夹命名调整

### v0.1.0 2022-07-09

- first publish on npm

### v0.0.1 2020-09-12

- first release

## License

the MIT License http://magicdawn.mit-license.org
