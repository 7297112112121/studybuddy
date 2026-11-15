/**
 * ai-docs: 为文档站生成面向 AI 的纯文本端点。
 *
 * 构建期(postBuild)对每个文档页做「MDX → 纯 Markdown」降级:
 *   1. 剥离 frontmatter(title/description/sidebar_position 留作索引元数据);
 *   2. 剥离围栏代码块之外的顶层 import/export 行;
 *   3. 自闭合 PascalCase 组件(交互原型)替换为占位注释;
 *   4. 白名单之外的 MDX 构造(成对组件标签、{表达式}、小写 HTML 标签)直接抛错,
 *      让违规内容暴露于 CI,与仓库 onBrokenLinks: 'throw' 的治理文化一致;
 *   5. 正文无 H1 时注入 `# {title}`。
 *
 * 产物:
 *   - {outDir}{permalink}.md     每页纯文本端点(与 index.html 并存,无冲突);
 *   - {outDir}/llms.txt          全站索引(llmstxt.org 格式,分节对齐 docs/ 的 _category_.json);
 *   - {outDir}/llms-full.txt     全量打包,便于一次性载入上下文。
 *
 * 零新增 npm 依赖。以 CJS 提供是因为 Docusaurus 用 require.resolve 加载本地插件,
 * 不认目录下的 index.ts。文档 URL 取自 loadedDocs[].permalink,不猜路由,
 * 中文文件名(研发流程/代码目录)因此天然正确。
 */

const fs = require('node:fs');
const path = require('node:path');

/** docs/ 一级目录 → llms.txt 分节名;根级文档(intro、研发流程)归入「概览」 */
const SECTION_BY_DIR = {
  dev: '技术文档',
  product: '产品文档',
  other: '其他',
  test: '测试文档',
};

const SECTION_ORDER = ['概览', ...Object.values(SECTION_BY_DIR)];

/** 自闭合 PascalCase 组件(本仓库仅线框原型组件属于此类) */
const SELF_CLOSING_COMPONENT = /^\s*<([A-Z][A-Za-z0-9]*)\s*\/>\s*$/;
/** 白名单外:顶层 import / export 行(MDX ESM) */
const TOP_LEVEL_IMPORT_EXPORT = /^(import|export)\s/;
/** 白名单外:成对 PascalCase 组件标签的任意片段(如 <Tabs ...>、</Tabs>) */
const PAIRED_COMPONENT_TAG = /<\/?[A-Z][A-Za-z0-9]*[\s/>]/;
/** 白名单外:小写 HTML 标签(MDX 中被 JSX 取代);检查前先剔除 <scheme:// 自动链接避免误报 */
const LOWERCASE_HTML_TAG = /<\/?[a-z][a-zA-Z-]*(?:\s[^<>]*?)?\/?>/;

function failFast(sourceLabel, what, line) {
  throw new Error(
    `ai-docs: ${sourceLabel} 含白名单外的 MDX 构造(${what}),已 fail-fast。\n` +
      `行内容: ${line.trim()}\n` +
      `处理方式: 改写为标准 Markdown,或在 website/src/plugins/ai-docs/index.js 扩充白名单并说明理由。`,
  );
}

/** 用等长占位符掩盖行内反引号代码,避免代码内容触发构造检查 */
function maskInlineCode(line) {
  return line.replace(/`[^`]*`/g, (m) => '·'.repeat(m.length));
}

/** 剥离 frontmatter,留存 title/description/sidebar_position */
function splitFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(raw);
  if (!match) {
    return {body: raw};
  }
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^(title|description|sidebar_position):\s*(.*?)\s*$/.exec(line);
    if (!kv) {
      continue;
    }
    meta[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '');
  }
  const sidebarPosition = Number(meta.sidebar_position);
  return {
    body: raw.slice(match[0].length),
    title: meta.title,
    description: meta.description,
    sidebarPosition: Number.isFinite(sidebarPosition) ? sidebarPosition : undefined,
  };
}

/** MDX → 纯 Markdown 降级管线(见文件头注释) */
function degradeToMarkdown(raw, sourceLabel) {
  const {body} = splitFrontmatter(raw);
  const out = [];
  let inFence = false;
  let fenceMarker = '';

  for (const line of body.split(/\r?\n/)) {
    const fence = /^\s*(```|~~~)/.exec(line);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1];
      } else if (line.trim().startsWith(fenceMarker)) {
        inFence = false;
      }
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }

    if (TOP_LEVEL_IMPORT_EXPORT.test(line)) {
      continue;
    }

    const component = SELF_CLOSING_COMPONENT.exec(line);
    if (component) {
      out.push(`<!-- 交互原型:${component[1]}(网页版渲染,纯文本端点不含) -->`);
      continue;
    }

    // 构造检查前掩盖行内代码与已转义的 \{ \},防误报
    const checked = maskInlineCode(line).replace(/\\[{}]/g, '');
    if (checked.includes('{') || checked.includes('}')) {
      failFast(sourceLabel, 'MDX {表达式}', line);
    }
    if (PAIRED_COMPONENT_TAG.test(checked)) {
      failFast(sourceLabel, '成对 PascalCase 组件标签', line);
    }
    if (LOWERCASE_HTML_TAG.test(checked.replace(/<[\w.-]+:\/\//g, ''))) {
      failFast(sourceLabel, '小写 HTML 标签', line);
    }

    out.push(line);
  }

  return out.join('\n');
}

/** 正文无 H1 时注入 `# {title}`;顺带压缩 3 个以上连续换行 */
function normalizeBody(degraded, title) {
  let body = degraded.replace(/\n{3,}/g, '\n\n').trim();
  if (!/^# /m.test(body)) {
    body = `# ${title}\n\n${body}`;
  }
  return `${body}\n`;
}

module.exports = function aiDocsPlugin(context) {
  return {
    name: 'ai-docs',
    async postBuild(props) {
      // Docusaurus 的 postBuild props 只带本插件自己的 content;
      // docs 插件的数据经 props.plugins[].content 获取(content.loadedVersions[].docs)
      const docsContent = props.plugins?.find(
        (plugin) => plugin.name === 'docusaurus-plugin-content-docs',
      )?.content;
      const loadedDocs = docsContent?.loadedVersions?.flatMap(
        (version) => version.docs,
      );
      if (!loadedDocs?.length) {
        throw new Error(
          'ai-docs: 未取到 Docusaurus 文档数据(loadedVersions[].docs 为空),检查 docs 插件配置。',
        );
      }

      const {url: siteUrl, title: siteTitle, tagline} = context.siteConfig;
      const docs = loadedDocs.map((doc) => {
        // loadedDoc.source 是 @site 别名路径(如 "@site/../docs/intro.md"),
        // 转回绝对路径读取原文;无 filePath 字段是 content.docs 的既定形状
        const sourceAbs = doc.source?.startsWith('@site')
          ? path.join(
              context.siteDir,
              doc.source.slice('@site'.length).replace(/^[/\\]/, ''),
            )
          : doc.source;
        const sourceLabel = sourceAbs ?? doc.id;
        if (!sourceAbs || !fs.existsSync(sourceAbs)) {
          throw new Error(`ai-docs: 文档源文件缺失: ${sourceLabel}`);
        }
        const raw = fs.readFileSync(sourceAbs, 'utf8');
        const fm = splitFrontmatter(raw);
        const title = doc.title ?? fm.title ?? doc.id;
        const degraded = degradeToMarkdown(raw, sourceLabel);
        const sidebarPosition =
          doc.sidebarPosition ?? fm.sidebarPosition ?? 9999;
        return {
          id: doc.id,
          permalink: doc.permalink,
          title,
          description: doc.description ?? fm.description ?? title,
          sidebarPosition,
          body: normalizeBody(degraded, title),
        };
      });

      // 每页 .md 端点。permalink 含 baseUrl(/studybuddy/...),而构建产物落在 outDir 根,
      // 故先剥掉 baseUrl;目录索引页(permalink 以 / 结尾)写 index.md,与其 index.html 同构
      const {baseUrl} = context;
      const toOutPath = (permalink) => {
        let rel = permalink.startsWith(baseUrl)
          ? permalink.slice(baseUrl.length)
          : permalink;
        rel += rel.endsWith('/') ? 'index.md' : '.md';
        return path.join(props.outDir, rel);
      };
      const toEntryUrl = (permalink) =>
        encodeURI(
          `${siteUrl}${permalink}${permalink.endsWith('/') ? 'index.md' : '.md'}`,
        );
      for (const doc of docs) {
        const target = toOutPath(doc.permalink);
        fs.mkdirSync(path.dirname(target), {recursive: true});
        fs.writeFileSync(target, doc.body, 'utf8');
      }

      // 分节:按 docs/ 一级目录归类,未知目录 fail-fast,保住分节与 _category_.json 的对应关系
      const sections = new Map();
      for (const doc of docs) {
        const dir = doc.id.includes('/') ? doc.id.split('/')[0] : '';
        const section = dir === '' ? '概览' : SECTION_BY_DIR[dir];
        if (!section) {
          throw new Error(
            `ai-docs: docs/ 下出现未登记的一级目录「${dir}」(${doc.id}),` +
              '请在 SECTION_BY_DIR 补充分节后重建。',
          );
        }
        const bucket = sections.get(section) ?? [];
        bucket.push(doc);
        sections.set(section, bucket);
      }

      const sortDocs = (a, b) =>
        a.sidebarPosition - b.sidebarPosition || a.id.localeCompare(b.id, 'zh');
      const orderedSections = SECTION_ORDER.filter((s) => sections.has(s));

      const header = [
        `# ${siteTitle}`,
        '',
        `> ${tagline ?? siteTitle}`,
        '',
      ].join('\n');
      const intro =
        `本站为「${siteTitle}」项目文档。以下链接均指向纯文本 Markdown 端点` +
        `(去掉 .md 后缀即为人类渲染的 HTML 页),适合 AI 与工具直接消费。` +
        `全站入口: ${siteUrl}${context.baseUrl}\n`;

      const indexLines = [header, intro];
      const fullParts = [header.replace(/\n$/, ''), '', intro.trimEnd()];
      for (const section of orderedSections) {
        const bucket = [...sections.get(section)].sort(sortDocs);
        indexLines.push(`\n## ${section}\n`);
        for (const doc of bucket) {
          indexLines.push(
            `- [${doc.title}](${toEntryUrl(doc.permalink)}): ${doc.description}`,
          );
        }
        fullParts.push(
          `\n## ${section}\n`,
          ...bucket.map((doc) => `---\n\n${doc.body.trimEnd()}`),
        );
      }

      fs.writeFileSync(
        path.join(props.outDir, 'llms.txt'),
        `${indexLines.join('\n')}\n`,
        'utf8',
      );
      fs.writeFileSync(
        path.join(props.outDir, 'llms-full.txt'),
        `${fullParts.join('\n')}\n`,
        'utf8',
      );
    },
  };
};
