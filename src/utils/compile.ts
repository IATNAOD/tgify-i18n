import vm from 'vm';

const regex = /`/gm

export const escape = (template: string): string => {
  return `\`${template.replace(regex, '\\`')}\``;
}

export const compile = (template: string, defaultContext?: object, ops?: vm.RunningScriptInNewContextOptions) => {
  const options = Object.assign({ timeout: 500 }, ops)
  const script = new vm.Script(escape(template))

  return (context: object) => {
    try {
      return script.runInNewContext(Object.assign({}, defaultContext, context), options)
    } catch (err: any) {
      throw new Error(err.toString())
    }
  }
}