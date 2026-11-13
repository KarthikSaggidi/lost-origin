// Increase authored admin text by 2.5 px while preserving its original cascade.
// This is a build-time CSS transform; website text and receipt HTML are unaffected.
import postcss from "postcss";
export default function adminTypography() {
  return {
    postcssPlugin: "lost-origin-admin-typography",
    OnceExit(root) {
      const overrides = [];
      root.walkRules((rule) => {
        const ancestors = [];
        for (
          let parent = rule.parent;
          parent && parent.type !== "root";
          parent = parent.parent
        ) {
          if (parent.type === "atrule" && /keyframes/i.test(parent.name))
            return;
          if (parent.type === "atrule") ancestors.push(parent);
        }
        const declarations = (rule.nodes || []).filter(
          (node) => node.type === "decl",
        );
        let size,
          important = false;
        for (const declaration of declarations) {
          if (declaration.prop === "font-size") {
            size = declaration.value;
            important = declaration.important;
          } else if (declaration.prop === "font") {
            const match = declaration.value.match(
              /(?:^|\s)((?:\d+(?:\.\d+)?(?:px|rem|em))|(?:clamp\([^)]*\)))(?:\s*\/|\s)/,
            );
            if (match) {
              size = match[1];
              important = declaration.important;
            }
          }
        }
        if (!size || /^(inherit|initial|unset|revert|0)$/.test(size)) return;
        const selectors = rule.selectors
          .filter(
            (selector) =>
              !/(?:\.customer-|\.home-|\.site-footer|\.minimal-menu|\.menu-item|\.cart-bar|\.hero-action)/.test(
                selector,
              ),
          )
          .map((selector) => {
            if (selector.includes(".admin-app")) return selector;
            if (["html", "body", ":root"].includes(selector))
              return ".admin-app";
            return `.admin-app ${selector}`;
          });
        if (!selectors.length) return;
        let copy = postcss.rule({ selectors: [...new Set(selectors)] });
        copy.append(
          postcss.decl({
            prop: "font-size",
            value: `calc(${size} + var(--admin-type-increase, 2.5px))`,
            important,
          }),
        );
        for (const ancestor of ancestors) {
          const wrapper = postcss.atRule({
            name: ancestor.name,
            params: ancestor.params,
          });
          wrapper.append(copy);
          copy = wrapper;
        }
        overrides.push(copy);
      });
      root.append(...overrides);
    },
  };
}
