## cmds

```sh
# 启动
weread-spy dl --just-launch

# qiong
weread-spy dl -u https://weread.qq.com/web/reader/ada325807168230aada7458kc81322c012c81e728d9d180

# 生成
weread-spy gen -u https://weread.qq.com/web/reader/ada325807168230aada7458kc81322c012c81e728d9d180

# 生成 & clean
weread-spy gen -c -u https://weread.qq.com/web/reader/ada325807168230aada7458kc81322c012c81e728d9d180
```

红楼梦

```sh
# 启动
weread-spy dl --just-launch

weread-spy dl -u https://weread.qq.com/web/reader/41432f705de453414ca0b4akc81322c012c81e728d9d180

# 生成
weread-spy gen -u https://weread.qq.com/web/reader/41432f705de453414ca0b4akc81322c012c81e728d9d180

weread-spy gen -c -u https://weread.qq.com/web/reader/41432f705de453414ca0b4akc81322c012c81e728d9d180
```

```
cat ./data/url.txt | xargs -t -I url sh -c "weread-spy dl -u url && weread-spy gen -u url"
```
