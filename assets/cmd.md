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

```json
{
  "https://weread.qq.com/web/reader/41432f705de453414ca0b4akc81322c012c81e728d9d180": {
    "bookId": "910419",
    "title": "红楼梦（全集）"
  },
  "https://weread.qq.com/web/reader/ada325807168230aada7458kc81322c012c81e728d9d180": {
    "bookId": "23601930",
    "title": "富爸爸穷爸爸（20周年修订版）"
  },
  "https://weread.qq.com/web/reader/95e323805dfeb195e2928b1kc81322c012c81e728d9d180": {
    "bookId": "917169",
    "title": "高敏感是种天赋"
  },
  "https://weread.qq.com/web/reader/5e1329a0521ae85e1d1cb6akc4c329b011c4ca4238a0201": {
    "bookId": "137960",
    "title": "穷爸爸富爸爸全集"
  },
  "https://weread.qq.com/web/reader/04832c405c6c4204842b439kc81322c012c81e728d9d180": {
    "bookId": "814146",
    "title": "一个叫欧维的男人决定去死"
  },
  "https://weread.qq.com/web/reader/5a2323e05dd8485a2cfe05fkc81322c012c81e728d9d180": {
    "bookId": "907336",
    "title": "耶路撒冷三千年"
  },
  "https://weread.qq.com/web/reader/ed532a405d237aed5c48b3dkc81322c012c81e728d9d180": {
    "bookId": "861050",
    "title": "步履不停"
  },
  "https://weread.qq.com/web/reader/43932400718f10ec4391ed7kc81322c012c81e728d9d180": {
    "bookId": "26153196",
    "title": "经济学通识（第二版）"
  },
  "https://weread.qq.com/web/reader/87432de071704c248742adakc4c329b011c4ca4238a0201": {
    "bookId": "24136740",
    "title": "明代处世奇书·智囊全集2"
  },
  "https://weread.qq.com/web/reader/74b32cf05cce1174b3722b9kc4c329b011c4ca4238a0201": {
    "bookId": "839185",
    "title": "月亮与六便士"
  },
  "https://weread.qq.com/web/reader/d4f320705cbb1dd4f6fa3dekc81322c012c81e728d9d180": {
    "bookId": "834333",
    "title": "金字塔原理（麦肯锡40年经典培训教材）"
  },
  "https://weread.qq.com/web/reader/4d83260071c034e34d8523fkc81322c012c81e728d9d180": {
    "bookId": "29373667",
    "title": "技术的本质（经典版）"
  },
  "https://weread.qq.com/web/reader/00b321505e093900b67c60ckc81322c012c81e728d9d180": {
    "bookId": "919865",
    "title": "一定要，爱着点什么"
  }
}
```

## book cover url

挺经
https://weread.qq.com/web/reader/f95326905c14a3f9545d74ekc4c329b011c4ca4238a0201

家书
https://weread.qq.com/web/reader/566323505c7013566201ddckc81322c012c81e728d9d180
