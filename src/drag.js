import { RenderManager, elementHadPaint } from "./utils.js";
const renderManager = new RenderManager();

export class Dragable {
  __initialized__ = false; //是否初始化完成
  closeDragCallback = null;
  initializedCallbackList = [];
  beginDragFnList = [];
  endDragFnList = [];
  moveFnList = [];
  plugin = {};
  elRect = null;
  isDestroyed = false;
  x = 0; // 鼠标按下时的x坐标
  y = 0; // 鼠标按下时的y坐标
  matrix2D = null;
  constructor(el) {
    if (!(el instanceof HTMLElement))
      throw new Error("el must be a HTMLElement");
    if (el.__drage__instance instanceof Dragable) return el.__drage__instance;
    this.el = el;
    this.__drage__instance = this;
    this.zIndex = null;
    this.active = false;
    this.matrix2D = this.matrix(this.el); // 初始化矩阵
    this.plugin.RenderManager = renderManager; //渲染优化器
    //元素是否已经插入到文档,插入成功进行初始化
    elementHadPaint(this.el, (el) => {
      const { left, top, right, bottom, width, height } =
        el.getBoundingClientRect();
      this.elRect = { left, top, right, bottom, width, height };
      this.__notifyInit();
    });
    // 绑定this
    this.mouseDownFn = this.mouseDownFn.bind(this);
    this.mouseMoveFn = this.mouseMoveFn.bind(this);
    this.mouseUpFn = this.mouseUpFn.bind(this);
    this.drag();
  }

  initialized(fn) {
    if (typeof fn !== "function") throw new Error("fn must be a function");
    if (this.__initialized__) fn(this);
    else this.initializedCallbackList.push(fn);
  }
  __notifyInit() {
    this.__initialized__ = true;
    this.el.__drage__instance = this;
    this.initializedCallbackList.forEach(
      (fn) => typeof fn === "function" && fn(this),
    );
    this.initializedCallbackList = []; //清空
  }
  //元素transfrom或者transfromString转矩阵
  matrix(el) {
    let transformString = "";
    if (!(el instanceof HTMLElement) && typeof el !== "string")
      throw new Error("el must be a HTMLElement or a string");
    if (typeof el === "string") {
      transformString = el;
    } else {
      while (el) {
        const temp = window.getComputedStyle(el, "").transform;
        transformString = (temp === "none" ? "" : temp) + " " + transformString;
        el = el.parentElement;
      }
    }

    const matrix = new DOMMatrix(transformString.trim());
    return matrix;
  }
  //目前只考虑拖拽，所以只有x，y
  translateMatrix(matrix, x, y) {
    matrix.e += x;
    matrix.f += y;
  }
  elRectChange(x, y) {
    // console.log(this.elRect, x, y);
    this.elRect.left += x;
    this.elRect.top += y;
    this.elRect.right += x;
    this.elRect.bottom += y;
  }
  //变换渲染
  change(moveX, moveY) {
    if (!this.active) return;
    this.__change(moveX, moveY);
  }
  //强制变换渲染
  forceChange(x, y) {
    this.__change(x, y);
  }
  __change(x, y) {
    this.translateMatrix(this.matrix2D, x, y);
    this.elRectChange(x, y);
    // 更新元素的 transform 属性
    this.el.style.transform = this.matrix2D.toString();
  }
  // 开启拖拽事件
  drag() {
    this.el.addEventListener("mousedown", this.mouseDownFn);
    this.closeDragCallback = () => {
      this.el.removeEventListener("mousedown", this.mouseDownFn);
      document.removeEventListener("mousemove", this.mouseMoveFn);
      document.removeEventListener("mouseup", this.mouseUpFn);
      this.closeDragCallback = null;
    };
  }
  // ============拖拽事件===================
  mouseDownFn(e) {
    e.stopPropagation();
    if (e.button !== 0) return;
    this.beginDrag();
    debugger;
    this.el.style.setProperty(
      "z-index",
      this.zIndex === null ? 999 : this.zIndex,
    );
    this.x = e.clientX;
    this.y = e.clientY;
    this.active = true;
    document.addEventListener("mouseup", this.mouseUpFn);
    document.addEventListener("mousemove", this.mouseMoveFn);
  }
  mouseUpFn(e) {
    e.stopPropagation();
    if (e.button !== 0 || !this.active) return;
    this.endDrag();
    this.active = false;
    // 移除事件监听
    document.removeEventListener("mouseup", this.mouseUpFn);
    document.removeEventListener("mousemove", this.mouseMoveFn);
  }
  mouseMoveFn(e) {
    e.stopPropagation();
    if (!this.active) return;
    const { clientX, clientY } = e;
    //计算移动距离
    const state = {
      moveX: clientX - this.x,
      moveY: clientY - this.y,
    };
    //调用移动函数
    this.moveFnList.forEach((fn) => fn(this, state));
    //有渲染优化器
    if (this.plugin.RenderManager) {
      this.plugin.RenderManager.render(() =>
        this.change(state.moveX, state.moveY),
      );
    }
    //没有渲染优化器
    else {
      this.change(state.moveX, state.moveY);
    }
    //更新x,y
    this.x = clientX;
    this.y = clientY;
  }
  // =========================================

  beginDrag() {
    this.beginDragFnList.forEach((fn) => fn(this));
  }
  endDrag() {
    this.endDragFnList.forEach((fn) => fn(this));
  }
  closeDrag() {
    typeof this.closeDragCallback === "function" &&
      this.closeDragCallback(this);
  }
  addBeginDragFn(fn) {
    typeof fn === "function" && this.beginDragFnList.push(fn);
  }
  removeBeginDragFn(fn) {
    this.beginDragFnList = this.beginDragFnList.filter((item) => item !== fn);
  }
  addEndDragFn(fn) {
    typeof fn === "function" && this.endDragFnList.push(fn);
  }
  removeEndDragFn(fn) {
    this.endDragFnList = this.endDragFnList.filter((item) => item !== fn);
  }
  addMoveFn(fn) {
    typeof fn === "function" && this.moveFnList.push(fn);
  }
  removeMoveFn(fn) {
    this.moveFnList = this.moveFnList.filter((item) => item !== fn);
  }
  destroy() {
    //  关闭拖拽事件监听
    this.closeDrag();

    //  清空回调列表
    this.beginDragFnList = [];
    this.endDragFnList = [];
    this.moveFnList = [];
    this.initializedCallbackList = [];

    //  移除引用
    this.el && (this.el.__drage__instance = null);
    this.el = null;
    this.elRect = null;
    this.matrix2D = null;
    this.plugin = null;

    // 标记未初始化
    this.__initialized__ = false;

    // 清理 closeDragCallback
    this.closeDragCallback = null;

    //标记为已经被销毁
    this.isDestroyed = true;
  }
}

export class ShareDragable extends Dragable {
  constructor(elList) {
    if (!Array.isArray(elList) && !(elList instanceof NodeList)) {
      elList = [elList];
    }
    super(elList[0]);
    this.activeEl = null;
    this.shareElList = new Set();

    Array.from(elList).forEach((el) => {
      this.add(el);
    });
  }

  __notifyInit() {
    super.__notifyInit();
    this.activeEl = this.el;
  }
  add(el) {
    this.shareElList.add(el);
    el.addEventListener("mousedown", this.mouseDownFn);
  }
  remove(el) {
    this.shareElList.delete(el);
    this.removeListener(el);
    // 移除elementState
    delete this.el.__elementState__;
  }
  has(el) {
    return this.shareElList.has(el);
  }
  clear() {
    this.shareElList.forEach((el) => {
      delete el.__elementState__;
    });
    this.shareElList.clear();
  }
  destroy() {
    super.destroy();
    // 清空共享元素列表
    this.shareElList.clear();
  }
  hold() {
    if (!this.activeEl.__elementState__) {
      this.activeEl.__elementState__ = createElementState();
    }
    this.activeEl.__elementState__.matrix2D = new DOMMatrix(this.matrix2D);
    this.activeEl.__elementState__.elRect = { ...this.elRect };
  }

  mouseDownFn(e) {
    const targetEl = e.currentTarget;
    if (this.activeEl !== targetEl && this.shareElList.has(targetEl)) {
      // 保持当前元素的elementState
      this.hold();
      this.activeEl = targetEl;
      // 切换el元素
      this.el = this.activeEl;
      // 如果元素没有elementState，才创建elementState
      if (!this.el.__elementState__) {
        const { left, top, right, bottom, width, height } =
          this.el.getBoundingClientRect();
        const elRect = { left, top, right, bottom, width, height };
        this.el.__elementState__ = createElementState(
          this.matrix(this.el),
          elRect,
        );
      }
      // 更换matrix2D和elRect
      this.matrix2D = new DOMMatrix(this.el.__elementState__.matrix2D);
      this.elRect = { ...this.el.__elementState__.elRect };
    }
    // 调用父类的mouseDownFn
    super.mouseDownFn(e);
  }
  removeListener(el) {
    el.removeEventListener("mousedown", this.mouseDownFn);
  }
}

function createElementState(matrix2D, elRect) {
  return {
    matrix2D,
    elRect,
  };
}
