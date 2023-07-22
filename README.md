# vite-plugin-c-markdown
A vite plugin converts markdown tag to html

```
npm i vite-plugin-c-markdown
```

vite.config.js:

```ts
import markdown from 'vite-plugin-c-markdown'

export default defineConfig({
    ...
    plugins: [
        markdown()
    ]
    ...
})

```



```html
 <c-markdown file="../../README.md" />
```

