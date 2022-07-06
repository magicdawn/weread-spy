// esm libs

type libglobby = typeof import('globby')
export let globby: libglobby['globby']
export let globbySync: libglobby['globbySync']

type libfilenameify = typeof import('filenamify')
export let filenamify: libfilenameify['default']

type libinquirer = typeof import('inquirer')
export let inquirerPrompt: libinquirer['prompt']

type libexeca = typeof import('execa')
export let execaCommandSync: libexeca['execaCommandSync']
export let execaCommand: libexeca['execaCommand']

type libenvPaths = typeof import('env-paths')
export let envPaths: libenvPaths['default']

export async function initEsmLibs() {
  {
    const lib = await import('globby')
    globbySync = lib.globbySync
    globby = lib.globby
  }

  {
    const lib = await import('filenamify')
    filenamify = lib.default
  }

  {
    const lib = await import('execa')
    execaCommand = lib.execaCommand
    execaCommandSync = lib.execaCommandSync
  }

  {
    const lib = await import('inquirer')
    inquirerPrompt = lib.prompt
  }

  {
    const lib = await import('env-paths')
    envPaths = lib.default
  }
}
