import path from "path"
import ts from "rollup-plugin-typescript2"
export default [
  {
    input: "./src/index.ts", // 入口文件
    output: [ // 出口文件
      {
        file: path.resolve(__dirname, './dist/index.esm.js'), // 输出位置
        format: "es",
      },
      {
        file: path.resolve(__dirname, './dist/index.cjs.js'), // 输出位置
        format: "cjs",
      }
    ],
    plugins: [
      ts()
    ]
  }
]