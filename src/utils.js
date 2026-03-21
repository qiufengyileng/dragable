/**
 * @description 判断rect1能否包含rect2
 * @param {{width:number,height:number}} rect1 包含容器
 * @param {{width:number,height:number}} rect2 被包含容器
 * @returns {boolean} 是否包含
 * */
export function canInclude(rect1, rect2) {
  return rect1.width >= rect2.width && rect1.height >= rect2.height;
}
/**
 * @description  判断rect2是否已经被包含在rect1中
 * @param {{left:number,top:number,right:number,bottom:number}} rect1 包含容器
 * @param {{left:number,top:number,right:number,bottom:number}} rect2 被包含容器
 * @returns {boolean} 是否包含
 * */
export function isIncludeRect(rect1, rect2) {
  return (
    rect1.left <= rect2.left &&
    rect1.right >= rect2.right &&
    rect1.top <= rect2.top &&
    rect1.bottom >= rect2.bottom
  );
}
/**
 * @description 计算rect1和rect2的偏移量，给rect2加上偏移量，可以将rect2和rect1左上角对其
 * @param {{left:number,top:number,right:number,bottom:number}} rect1
 * @param {{left:number,top:number,right:number,bottom:number}} rect2
 * @returns {{left:number,top:number}} 偏移位置
 */
export function computedOffset(rect1, rect2) {
  return {
    left: rect1.left - rect2.left,
    top: rect1.top - rect2.top,
  };
}

/**
 * @description 渲染优化器，传入渲染函数，在下一帧前执行
 * */
export class RenderManager {
  RenderFn = null; //渲染函数
  constructor() {}
  render(fn) {
    //如果渲染函数为null，代表上次提交的渲染任务已经被执行
    //重新提交新的任务，否则只需要更新渲染函数
    if (!this.RenderFn) {
      this._commit();
    }
    this.RenderFn = fn;
  }
  _commit() {
    requestAnimationFrame(() => {
      typeof this.RenderFn === "function" && this.RenderFn();
      this.RenderFn = null;
    });
  }
}
/**
 * @description 元素插入文档渲染后执行回调函数
 * @param {HTMLElement} el 元素
 * @param {function} callback 回调函数，可以拿到渲染后的元素各项参数
 * */
export function elementHadPaint(el, callback) {
  const _callback = () => requestAnimationFrame(() => callback(el));
  if (el.isConnected) {
    _callback();
  } else {
    let observer = new MutationObserver(() => {
      if (el.isConnected) {
        observer.disconnect();
        observer = null;
        _callback();
      }
    });
    observer.observe(document.body || document.documentElement, {
      childList: true, // 监听子节点增加或删除
      subtree: true, // 包括整个子树
    });
  }
}

/**
 * @description 判断rect1和rect2是否重叠
 * @param {{left:number,top:number,right:number,bottom:number}} rect1
 * @param {{left:number,top:number,right:number,bottom:number}} rect2
 * @returns {boolean} 是否重叠
 * */
export function isOverlap(rect1, rect2) {
  return (
    rect1.left < rect2.right &&
    rect1.right > rect2.left &&
    rect1.top < rect2.bottom &&
    rect1.bottom > rect2.top
  );
}
/**
 * @description 获取rect的中心位置
 * @param {{left:number,top:number,right:number,bottom:number}} rect
 * @returns {{left:number,top:number}} 中心位置
 * */
export function getCenterPositionOfRect(rect) {
  return {
    left: (rect.left + rect.right) / 2,
    top: (rect.top + rect.bottom) / 2,
  };
}

export class VirtualRect {
  constructor(el) {
    this.el = el;
    this._center = null;
    this.__dirty__centerValue = true;
    this.setRect();
  }
  get center() {
    if (this.__dirty__centerValue) {
      this._center = getCenterPositionOfRect(this);
      this.__dirty__centerValue = false;
    }
    return this._center;
  }
  setRect(params) {
    if (params) {
      this.left = params?.left ?? this.left;
      this.right = params?.right ?? this.right;
      this.top = params?.top ?? this.top;
      this.bottom = params?.bottom ?? this.bottom;
      this.width = params?.width ?? this.width;
      this.height = params?.height ?? this.height;
    } else {
      const { left, right, top, bottom, width, height } =
        this.el.getBoundingClientRect();
      this.left = left;
      this.right = right;
      this.top = top;
      this.bottom = bottom;
      this.width = width;
      this.height = height;
    }
    this.__dirty__centerValue = true;
  }
}
