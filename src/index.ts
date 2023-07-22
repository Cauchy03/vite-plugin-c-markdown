import { ModuleNode, Plugin, ViteDevServer } from 'vite'
import { style } from './assets/style'
import path from 'path'
import file from 'fs'
import MarkdownIt from 'markdown-it'
// const path = require('path');
// const file = require('fs');
// const MarkdownIt = require('markdown-it');

interface HmrContext {
  file: string
  timestamp: number
  modules: Array<ModuleNode>
  read: () => string | Promise<string>
  server: ViteDevServer
}

// 将txt文本转化为Html
const md = new MarkdownIt();
export const transformMarkdown = (mdText: string): string => {
  // 加上一个 class 名为 article-content 的 wrapper，方便我们等下添加样式
  return `
    <section class='article-content'>
      ${md.render(mdText)}
    </section>
  `;
}

// 创建一个map对象用于存储依赖关系
const mdRelationMap = new Map<string, string>();

export default function markdownPlugin(): Plugin {
  // 匹配文件名后缀为.vue
  const vueRE = /\.vue$/;
  // 匹配HTML标签<c-markdown>
  const markdownRE = /\<c-markdown.*\/\>/g;
  // 匹配提取文件路径
  const filePathRE = /(?<=file=("|')).*(?=('|"))/;

  return {
    // 插件名称 将出现在警告和错误中
    name: 'vite-plugin-markdown',
    // 该插件在 plugin-vue 插件之前执行，这样就可以直接解析到原模板文件
    enforce: 'pre',
    /** 
     * 代码转译，这个函数的功能类似于 `webpack` 的 `loader`
     * @param code 匹配文件的代码
     * @param id  文件路径
     * @param options 用于配置SSR
     * @returns 
     */ 
    transform(code: any, id: any, options: any) {
      // 过滤非vue文件且没有c-markdown标签
      if (!vueRE.test(id) || !markdownRE.test(code)) return code

      // 匹配 vue 文件中所有的 c-markdown 标签
      const mdList = code.match(markdownRE)
      let transformCode = code;
      mdList?.forEach((md: any) => {
        // 匹配 markdown 文件目录
        const fileRelativePaths = md.match(filePathRE)
        if (!fileRelativePaths?.length) return

        // markdown 文件的相对路径
        // 非空断言操作符 ! 可以用于告诉 TypeScript 编译器，某个表达式的值不会为 null 或 undefined
        const fileRelativePath = fileRelativePaths![0]
        // 找到当前 vue 的目录 (上一级目录)
        const fileDir = path.dirname(id)
        // 根据当前 vue 文件的目录和引入的 markdown 文件相对路径，拼接出 md 文件的绝对路径
        const filePath = path.join(fileDir, fileRelativePath)
        // console.log(filePath)
        const mdFilePath = filePath.replace(/\\/g, "/")
        // console.log(mdFilePath)
        // 读取 markdown 文件的内容 readFileSync同步读取
        const mdText = file.readFileSync(mdFilePath, 'utf-8')
        // 将 c-markdown 标签替换成转换后的 html 文本
        transformCode = transformCode.replace(md, transformMarkdown(mdText));
        // 记录引入当前 md 文件的 vue 文件 id
        mdRelationMap.set(mdFilePath, id);
      })

      transformCode = `${transformCode}\n<style scoped>${style}</style>`
      // 将转换后的代码返回
      return transformCode
    },

    handleHotUpdate(ctx: HmrContext) {
      const { file, server, modules } = ctx
      // 过滤非 md 文件
      if (path.extname(file) !== '.md') return
      // 找到引入该 md 文件的 vue 文件
      const relationId = mdRelationMap.get(file) as string
      // 找到该 vue 文件的 moduleNode
      const relationModule = [...server.moduleGraph.getModulesByFile(relationId)!][0]
      // 发送 websocket 消息，进行单文件热重载
      server.ws.send({
        type: 'update',
        updates: [
          {
            type: 'js-update',
            path: relationModule.file!,
            acceptedPath: relationModule.file!,
            timestamp: new Date().getTime()
          }
        ]
      })
      // 指定需要重新编译的模块
      return [...modules, relationModule]
    }
  }
}

// overwrite for cjs require('...')() usage
// module.exports = markdownPlugin
// markdownPlugin['default'] = markdownPlugin