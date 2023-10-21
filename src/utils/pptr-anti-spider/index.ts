import { baseDebugDetail } from '$common/index'

const debug = baseDebugDetail.extend('pptr:anti-spider')

export function processAppJs(js: string | undefined, fileBasename: string) {
  debug('modifying %s', fileBasename)
  js ||= ''

  // debugger
  js = removeDebuggerLimit(js) || js

  // expose `__vue__`
  // https://github.com/vuejs/vue/blob/49b6bd4264c25ea41408f066a1835f38bf6fe9f1/src/core/instance/lifecycle.ts#L78
  // 在 Vue.prototype._update 实现
  {
    // 设置环境变量
    // _0x44ebd7['env'] = {},
    // _0x44ebd7['argv'] = [],
    js = js.replace(/(_0x\w+)\['env'\]=\{\},(_0x\w+)\['argv'\]=\[\],/, (match, var1, var2) => {
      return `${var1}.env = { VUE_DISMISS_DEVTOOLS: 'yes' }, ${var2}.argv = [],`
    })

    // 'yes'===_0x16452a['env']['VUE_DISMISS_DEVTOOLS'] && _0x1be68e && (_0x1be68e['__vue__'] = null),
    // 'yes'===_0x16452a['env'][_0x3744('0x22b')] && _0x5ad1f7['$el'] && (console['log']('__vue__'),
    js = js.replace(/'yes'===([_\w]+\['env'\])/g, `'yes' !== $1`)

    // 'yes'===_0x1372e5[_0x3db9('0x5ba')]['VUE_DISMISS_DEVTOOLS'] && _0x243be5 && (_0x243be5[_0x3db9('0xcce')] = null),
    // 'yes'===_0x1372e5[_0x3db9('0x5ba')][_0x3db9('0xf2')] && _0x45b52d['$el'] && (console['log'](_0x3db9('0xcce')),
    js = js.replace(/'yes'===([_\w]+\[_0x\w+\('0x\w+'\)\]\[)/g, `'yes' !== $1`)

    // _0x2a82('0x207')===_0x5d11b9['env']['VUE_DISMISS_DEVTOOLS']&&_0x1051e8[_0x2a82('0xad7')] && (console['log']('__vue__'),
    // _0x1051e8['$el'][_0x2a82('0x2b2')] = _0x1051e8),
    // 变种太多
  }

  {
    // vuex
    // this['commit'] = function(_0xe59d72, _0x31227c, _0x3aa954) {
    //     return _0x5068e8['call'](_0x43325a, _0xe59d72, _0x31227c, _0x3aa954);
    // }
    js = js.replace(
      /this\['commit'\]=function\((_0x\w+),(_0x\w+),(_0x[\w]+)\)\{([ \S]+?)\}/,
      (match, arg1, arg2, arg3, functionBody) => {
        return `
        // access store
        window.__stores__ ||= new WeakSet(),
        window.__stores__.add(this),

        this['commit'] = function(${arg1}, ${arg2}, ${arg3}) {
          // hook
          const [mutation, payload] = [${arg1}, ${arg2}]
          console.log('injected vuex.commit: ', mutation, payload)

          // access store
          if (this) {
            window.__stores__.add(this)
            if (Object.keys(this._actions).length > 10) {
              window.__store__ = this
            }
          }

          if (mutation === 'updateReaderContentHtml') {
            window.__store__ = this
            window.__chapterContentHtmlArray__ = payload
          }

          ${functionBody}
        }`
      }
    )
  }

  return js
}

export function findMatchingIndex(input: string, fi: number) {
  const pairs = {
    '(': ')',
    '{': '}',
    '[': ']',
  }

  const left = input[fi]
  const right = pairs[left]
  if (!right) {
    return -1
  }

  let count = 1 // input[fi] = left

  for (let i = fi + 1, len = input.length; i < len; i++) {
    const cur = input[i]
    if (cur === right) {
      count--
      if (count === 0) {
        return i
      }
    } else if (cur === left) {
      count++
    }
  }

  return -1 // not found
}

/**
(function() {
    _0x24fa27(this, function() {
        var _0x2fc99b = new RegExp('function\x20*\x5c(\x20*\x5c)');
        var _0x2ca847 = new RegExp('\x5c+\x5c+\x20*(?:[a-zA-Z_$][0-9a-zA-Z_$]*)','i');
        var _0x1fee8d = _0x4dab42('init');
        if (!_0x2fc99b[_0x1d23('0x403')](_0x1fee8d + 'chain') || !_0x2ca847['test'](_0x1fee8d + 'input')) {
            _0x1fee8d('0');
        } else {
            _0x4dab42();
        }
    })();
}());

const _0x2fdb16 = new RegExp(_0x7031('0x945'));
 */

// 这种变种太多
// ['constructor']('while\x20(true)\x20{}')['apply']('counter')
// ['constructor']('debu'+_0x4584('0xe0'))['call']('action'))
// ['constructor'](_0x4584('0x3a5')+_0x4584('0xe0'))['apply']('stateObject'))

function removeDebuggerLimit(js: string): string | undefined {
  let index = -1
  if (index === -1) {
    index = js.indexOf(String.raw`=new RegExp('function\x20*\x5c(\x20*\x5c)')`)
  }
  if (index === -1) {
    index = js.indexOf(String.raw`=new RegExp('\x5c+\x5c+\x20*(?:[a-zA-Z_$][0-9a-zA-Z_$]*)','i')`)
  }

  /**
    const _0x2fdb16 = new RegExp(_0x7031('0x945'));
    const _0x48182a = new RegExp(_0x7031('0x403'),'i');
   */
  if (index === -1) {
    const match =
      /const _0x\w+=new RegExp\(_0x\w+\('0x\w+'\)\);const _0x\w+=new RegExp\(_0x\w+\('0x\w+'\),'i'\);/g.exec(
        js
      )
    if (match) {
      index = match.index
    }
  }

  if (index === -1) {
    return
  }

  let prevBraceIndex = index
  while (js[prevBraceIndex] !== '{') prevBraceIndex--
  const endBraceIndex = findMatchingIndex(js, prevBraceIndex)

  // 变成空 function
  const code = js.slice(0, prevBraceIndex) + `{}` + js.slice(endBraceIndex + 1)
  return code
}
