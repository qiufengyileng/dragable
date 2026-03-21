const createNode = (type, text, props) => ({
  type,
  childNode: null,
  brotherNode: null,
  text,
  props: props || {},
});
//读取节点类型
function jugueType(el) {
  if (!el || !(el instanceof Node)) throw new Error("el must be a Node");
  switch (el.nodeType) {
    case 1:
      return "element";
    case 3:
      return "text";
    case 8:
      return "comment";
    case 9:
      return "document";
    case 11:
      return "DocumentFragment";
    default:
      return "unknown";
  }
}
function getElementTag(el) {
  return el.tagName.toLowerCase();
}
//根据真实节点，创建props参数，返回{}
function createProps(el) {
  let props = {};
  // 设置属性
  props = Object.assign(props, getAttributes(el));
  //设置方法，回调
  return props;
}
// 收集属性,返回{}
function getAttributes(el) {
  debugger;
  let attrs = {};
  if (typeof el?.hasAttributes === "function" && el?.hasAttributes()) {
    for (const attr of el.attributes) {
      switch (attr.name) {
        case "style":
          attrs.style = collectStyle(attr.value);
          break;
        default:
          if (!attrs.attrs) attrs.attrs = {};
          attrs.attrs[attr.name] = attr.value;
          break;
      }
    }
  }
  return attrs;
}
// 收集样式,返回{}
function collectStyle(styleStr) {
  const styleObj = {};
  if (styleStr) {
    const styleArr = styleStr.split(";");
    styleArr.forEach((item) => {
      if (item) {
        const [key, value] = item.split(":");
        styleObj[key.trim()] = value.trim();
      }
    });
  }
  return styleObj;
}
//递归遍历dom树，生成虚拟dom
export function buildVnodeTree(el) {
  if (!el) return null;
  const type = jugueType(el);
  let curNode;
  switch (type) {
    case "element":
      const tag = getElementTag(el);
      if (tag === "script") return;
      curNode = createNode(tag, null, createProps(el));
      break;
    case "text":
      curNode = createNode(type, el.textContent, createProps(el));
      break;
    case "comment":
      curNode = createNode(type, el.textContent, createProps(el));
      break;
    default:
      curNode = createNode(type, el.textContent, createProps(el));
      break;
  }
  let brotherNode;
  const children = el.childNodes;
  if (children?.length) {
    children.forEach((child) => {
      if (isEmptyTextNode(child)) return;
      const nextNode = buildVnodeTree(child);
      if (nextNode) {
        if (!brotherNode) {
          brotherNode = nextNode;
          curNode.childNode = brotherNode;
        } else {
          brotherNode.brotherNode = nextNode;
          brotherNode = brotherNode.brotherNode;
        }
      }
    });
  }
  return curNode;
}

/**
 * @description 虚拟dom树构建器
 * @returns 虚拟dom树
 */
class VnodeTreeBuilder {
  _filter = null; //过滤器
  constructor() {}
  buildByElement(el) {
    if (!el) return;
    if (typeof this._filter === "function" && !this._filter(el)) return;
    const type = jugueType(el);
    let curNode;
    switch (type) {
      case "element":
        const tag = getElementTag(el);
        if (tag === "script") return;
        curNode = createNode(tag, null, createProps(el));
        break;
      case "text":
        curNode = createNode(type, el.textContent, createProps(el));
        break;
      case "comment":
        curNode = createNode(type, el.textContent, createProps(el));
        break;
      default:
        curNode = createNode(type, el.textContent, createProps(el));
        break;
    }
    let brotherNode;
    const children = el.childNodes;
    if (children?.length) {
      children.forEach((child) => {
        if (isEmptyTextNode(child)) return;
        const nextNode = this.buildByElement(child);
        if (nextNode) {
          if (!brotherNode) {
            brotherNode = nextNode;
            curNode.childNode = brotherNode;
          } else {
            brotherNode.brotherNode = nextNode;
            brotherNode = brotherNode.brotherNode;
          }
        }
      });
    }
    return curNode;
  }
  filter(fn) {
    this._filter = fn;
  }
  buildByH(objOfH) {
    //h函数构建的对象。类似
    //h("div",{id:"app"},[h("p",{id:"p1"},"hello")])
  }
}

//判断是不是由空字符串组成的文本节点
function isEmptyTextNode(el) {
  return el.nodeType === 3 && el.textContent.trim() === "";
}
//先序遍历
function traverseTree(nodeTree, callback, fatherEl) {
  const el = callback(nodeTree, fatherEl);
  if (nodeTree?.childNode) {
    traverseTree(nodeTree.childNode, callback, el);
  }
  if (nodeTree?.brotherNode) {
    traverseTree(nodeTree.brotherNode, callback, fatherEl);
  }
}
//render
export function render(nodeTree, root) {
  debugger;
  const fragmentEl = document.createDocumentFragment(); // 创建文档片段
  traverseTree(
    nodeTree,
    (node, fatherEl) => {
      const el =
        node.type === "text"
          ? document.createTextNode(node.text)
          : document.createElement(node.type);
      if (node.type === undefined) {
        console.log(node);
      }
      debugger;
      const oldNode = el.vnode;
      el.vnode = node;
      node.el = el;
      propsPatch(node, oldNode);
      fatherEl.appendChild(el);
      return el;
    },
    fragmentEl,
  );
  root.vnode = nodeTree;

  root.innerHTML = "";
  root.appendChild(fragmentEl);
}
//辅助方法
function propsPatch(newVnode, oldVnode) {
  if (newVnode.props.style) {
    stylePatch(
      newVnode.props.style,
      oldVnode?.props?.style,
      newVnode?.el || oldVnode?.el,
    );
  }
  if (newVnode.props.attrs) {
    attrsPatch(
      newVnode.props.attrs,
      oldVnode?.props?.attrs,
      newVnode?.el || oldVnode?.el,
    );
  }
}
function textPatch(newVnode, oldVnode) {
  // debugger;
  if (newVnode.text !== oldVnode?.text) {
    oldVnode.el.textContent = newVnode.text;
  }
}
function attrsPatch(newProps = {}, oldProps = {}, el) {
  //遍历old,将newProps没有的去掉
  for (let key in oldProps) {
    if (!newProps[key]) {
      el.removeAttribute(key);
    }
  }
  //遍历new,将newProps有的添加到el.style
  for (let key in newProps) {
    el.setAttribute(key, newProps[key]);
  }
}
function stylePatch(newProps = {}, oldProps = {}, el) {
  //遍历old,将newProps没有的去掉
  for (let key in oldProps) {
    if (!newProps[key]) {
      el.style[key] = "";
    }
  }
  //遍历new,将newProps有的添加到el.style
  for (let key in newProps) {
    el.style[key] = newProps[key];
  }
}

function patchTree(newVnode, root) {
  // debugger;
  if (newVnode.type !== root?.vnode?.type) {
    root?.vnode?.type && root.removeChild(root.vnode.el);
    render(newVnode, root);
    console.log("类型不同，直接替换", root?.vnode);
    return;
  }
  propsPatch(newVnode, root?.vnode);
  if (newVnode.type === "text") textPatch(newVnode, root?.vnode);
  if (newVnode.childNode) {
    patchTree(newVnode.childNode, root?.vnode?.childNode?.el);
  }
  if (newVnode.brotherNode) {
    patchTree(newVnode.brotherNode, root?.vnode?.brotherNode?.el);
  }
}
