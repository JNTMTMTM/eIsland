/**
 * @file assets.d.ts
 * @description 渲染进程资源模块类型声明，支持 .jpg/.jpeg/.png/.svg/.gif/.webp 资源导入
 * @author 鸡哥
 */

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}
