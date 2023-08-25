# CHANGELOG

## v0.7.4 2023-08-26

- udpate deps

## v0.7.3 2023-07-21

- chore: update puppeteer, proxy-agent related

## v0.7.2 2023-07-19

- fix: use store.subscribe, cause pptr modify fails.

## v0.7.1 2023-07-19

- feat: use epubckeck-assets
- feat: rm execa, use plain `child_process.execSync`

## v0.7.0 2023-07-19

- fix `__vue__` exposure

## v0.6.0 2023-06-20

- 支持多页

### v0.5.2 2023-04-26

- 升级 w3c/epubcheck

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
