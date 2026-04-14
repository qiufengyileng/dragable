import { Dragable, ShareDragable } from "./drag.js";
import { canInclude, isIncludeRect, computedOffset, isOverlap, getCenterPositionOfRect, VirtualRect } from "./utils.js";

/**
 * @description 可拖拽元素的调用器，原始父类
 * */

class DragableInvoker {
  constructor() {
    this.dragList = [];
    this.removeLimitMap = new WeakMap(); //移除限制函数
  }
  add(drag) {
    drag.initialized(() => this.__add(drag));
  }
  //添加初始化完成的可拖拽元素
  __add(drag) {
    if (!(drag instanceof Dragable)) throw new Error("drag must be instanceof Dragable");
    if (this.dragList.includes(drag)) return; //不能重复添加
    this.dragList.push(drag);
    //添加限制
    this.beforeAdd(drag);
    const removeHandler = this.limit(drag);
    if (typeof removeHandler !== "function") {
      throw new Error("addLimit must return a  function to remove limit");
    }
    this.removeLimitMap.set(drag, removeHandler);
  }
  //beforeAdd
  beforeAdd(drag) {
    return drag;
  }
  //添加限制
  limit(drag) {
    return () => drag;
  }
  //移除限制
  removeLimit(drag) {
    drag.initialized(() => this.__removeLimit(drag));
  }
  __removeLimit(drag) {
    this.dragList = this.dragList.filter((item) => item !== drag);
    const removeHandler = this.removeLimitMap.get(drag);
    typeof removeHandler === "function" && removeHandler();
    this.removeLimitMap.delete(drag); //删除映射
  }
  //移除所有限制
  removeAll() {
    this.dragList.forEach((drag) => this.removeLimit(drag));
  }
}

/**
 * @param {Dragable[]} dragList 可拖拽的元素对象数组
 * @description 管理一组可拖拽的元素对象，管理他们的zIndex
 * */
export class DragInvokerOfZIndex extends DragableInvoker {
  maxZIndex = 1;
  constructor() {
    super();
  }
  limit(drag) {
    drag.zIndex = this.dragList.length;
    this.maxZIndex = Math.max(this.maxZIndex, drag.zIndex);
    const a = (drag) => {
      if (drag.zIndex !== this.maxZIndex) drag.zIndex = ++this.maxZIndex;
    };
    drag.addBeginDragFn(a);
    return () => {
      drag.removeBeginDragFn(a);
    };
  }
}

/**
 * @description 可拖拽元素的调用器，限制在指定区域内移动,border可以指定是否限制边界，默认全为true
 * @description 1.如果元素不能被包含在区域内，及元素尺寸大于区域尺寸，报错
 * @description 2.可以被包含且在区域内，不做任何操作
 * @description 3.可以被包含但不在区域内，将元素的位置调整到区域的左上角
 * @param {HTMLElement} root 限制区域元素
 * */
export class DragInvokerOfLimitInArea extends DragableInvoker {
  constructor(root) {
    super();
    this.areaEl = root;
    const { left, top, bottom, right, width, height } = this.areaEl.getBoundingClientRect();
    this.rootRect = { left, top, bottom, right, width, height };
    this.border = {
      left: true,
      top: true,
      bottom: true,
      right: true,
    };
  }
  beforeAdd(drag) {
    if (!canInclude(this.rootRect, drag.elRect)) {
      throw new Error("drag element must can be included in area element");
    }
    if (!isIncludeRect(this.rootRect, drag.elRect)) {
      const offset = computedOffset(this.rootRect, drag.elRect);
      drag.forceChange(offset.left, offset.top);
    }
  }
  limit(drag) {
    const a = (_, state) => {
      const { left: Aleft, top: Atop, bottom: Abottom, right: Aright } = this.rootRect;
      const { left: Dleft, top: Dtop, bottom: Dbottom, right: Dright } = drag.elRect;
      if (this.border.left && Aleft > Dleft + state.moveX) state.moveX = Aleft - Dleft;
      if (this.border.right && Aright < Dright + state.moveX) state.moveX = Aright - Dright;
      if (this.border.top && Atop > Dtop + state.moveY) state.moveY = Atop - Dtop;
      if (this.border.bottom && Abottom < Dbottom + state.moveY) state.moveY = Abottom - Dbottom;
    };

    drag.addMoveFn(a);
    return () => {
      drag.removeMoveFn(a);
    };
  }
}
/**
 * @description 传入两个可拖拽元素，他们两个互斥
 * @description 1.如果两个元素有重叠，移动第二个传入的dragable元素，使他们不重叠
 * @description 2.不重叠，不做任何处理
 * @param {Dragable} drag1 可拖拽元素1
 * @param {Dragable} drag2 可拖拽元素2
 * */
export class DragInvokerOfExclusion extends DragableInvoker {
  constructor(drag1, drag2) {
    if (drag1 === drag2) throw new Error("drag1 and drag2 must be different dragable");
    if (!(drag1 instanceof Dragable) || !(drag2 instanceof Dragable)) {
      throw new Error("drag1 and drag2 must be dragable");
    }
    super();
    this.drag1 = drag1;
    this.drag2 = drag2;
    this.rectMap = new WeakMap();

    super.add(drag1);
    super.add(drag2);
  }
  getOtherDrag(drag) {
    return drag === this.drag1 ? this.drag2 : this.drag1;
  }
  add() {
    console.warn("Please use addLimit() instead of add()");
  }
  beforeAdd(_) {
    if (this.dragList.length === 2) {
      //是否重叠
      if (isOverlap(...this.dragList.map((item) => item.elRect))) {
        //计算偏移量
        const offset = computedOffset(...this.dragList.map((item) => item.elRect));
        const x = this.dragList[0].elRect.width; //第一个元素的宽度
        this.dragList[1].forceChange(offset.left + x, offset.top);
      }
      this.rectMap.set(this.dragList[0], this.dragList[0].elRect);
      this.rectMap.set(this.dragList[1], this.dragList[1].elRect);
      //设置最小的length
      this.minLengthOfX = (this.dragList[0].elRect.width + this.dragList[1].elRect.width) / 2;
      this.minLengthOfY = (this.dragList[0].elRect.height + this.dragList[1].elRect.height) / 2;
    }
  }
  limit(drag) {
    const a = (drag, state) => {
      const { moveX, moveY } = state;
      const thisRect = this.rectMap.get(drag);
      const otherRect = this.rectMap.get(this.getOtherDrag(drag));
      const thisCenter = getCenterPositionOfRect(thisRect);
      const otherCenter = getCenterPositionOfRect(otherRect);
      const nextCenter = {
        left: thisCenter.left + moveX,
        top: thisCenter.top + moveY,
      };
      const dx = nextCenter.left - otherCenter.left; // 下一个中心与其他中心的水平距离
      const dy = nextCenter.top - otherCenter.top; // 下一个中心与其他中心的垂直距离
      const lengthX = Math.abs(dx);
      const lengthY = Math.abs(dy);
      if (lengthX < this.minLengthOfX && lengthY < this.minLengthOfY) {
        const overlapX = this.minLengthOfX - lengthX;
        const overlapY = this.minLengthOfY - lengthY;
        if (overlapX < overlapY) {
          state.moveX = moveX + (dx > 0 ? overlapX : -overlapX);
        } else {
          state.moveY = moveY + (dy > 0 ? overlapY : -overlapY);
        }
      }
    };
    drag.addMoveFn(a);
    return () => {
      drag.removeMoveFn(a);
    };
  }
}

/**
 * @description 传入一个可拖拽元素和一个挂钩元素
 * @description 当可拖拽元素和挂钩元素之间的距离小于吸附半径时，可拖拽元素会吸附到挂钩元素上（中心对齐）
 * @description 2.不重叠，不做任何处理
 * @param {Dragable} drag 可拖拽元素1
 * @param {VirtualRect} hook 虚拟挂钩元素，传入的元素必须经过被处理为VirtualRect对象
 * @param {number} snapRadius 吸附半径，默认值为10
 * */
export class DragInvokerOfSnap extends DragableInvoker {
  constructor(drag, hook, snapRadius = 10) {
    super();
    if (!(hook instanceof VirtualRect)) {
      throw new Error("hook must be VirtualRect");
    }
    this._snapRadius = snapRadius;
    this._hook = hook;
    super.add(drag);
  }
  beforeAdd(drag) {
    this.__adjust(drag);
  }
  updateHookPosition() {
    this._hook.setRect();
  }
  __adjust(drag) {
    const thisCenter = getCenterPositionOfRect(drag.elRect);
    const hookCenter = this._hook.center;
    const dx = thisCenter.left - hookCenter.left;
    const dy = thisCenter.top - hookCenter.top;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance !== 0 && distance < this._snapRadius) {
      drag.forceChange(hookCenter.left - thisCenter.left, hookCenter.top - thisCenter.top);
    }
  }
  limit(drag) {
    const a = (drag) => this.__adjust(drag);

    drag.addEndDragFn(a);
    return () => {
      drag.removeEndDragFn(a);
    };
  }
}
/**
 * @class DragInvokerOfLimitDirection
 * @extends DragableInvoker
 * @description
 * 限制拖拽只能沿指定方向移动。
 * 拖拽产生的移动向量 `(dx, dy)` 会被投影到给定方向中 **最接近的方向**，
 * 从而保证拖拽始终沿合法方向移动。
 * @param {number[]|number|{x:boolean,y:boolean}} directions
 * 1. 角度数组：[0, 45, 90, 135, 180, 225, 270, 315]
 * 2. 角度值：0, 45, 90, 135, 180, 225, 270, 315
 * 3. 对象：{x:boolean,y:boolean} 表示在x轴和y轴上是否允许移动。默认为false
 */

export class DragInvokerOfLimitDirection extends DragableInvoker {
  constructor(directions) {
    super();

    // 不是角度数组
    if (!Array.isArray(directions)) {
      //数字
      if (!isNaN(directions) && typeof directions === "number") {
        directions = [directions];
      } else if (typeof directions === "object") {
        let temp = [];
        if (directions.x) {
          temp.push(0, 180);
        }
        if (directions.y) {
          temp.push(90, 270);
        }
        directions = temp;
      } else {
        throw new Error("directions must be number,array or object");
      }
    }

    //转成单位向量
    this._dirs = directions.map((deg) => {
      const rad = (deg * Math.PI) / 180;
      return {
        x: Math.cos(rad),
        y: Math.sin(rad),
      };
    });
  }

  limit(drag) {
    const fn = (_, state) => {
      const { moveX: dx, moveY: dy } = state;

      if (dx === 0 && dy === 0) return;

      let bestProj = 0;
      let bestDir = null;

      for (const dir of this._dirs) {
        //向量点积
        const proj = dx * dir.x + dy * dir.y;
        if (!bestDir || Math.abs(proj) > Math.abs(bestProj)) {
          bestProj = proj;
          bestDir = dir;
        }
      }

      state.moveX = bestProj * bestDir.x;
      state.moveY = bestProj * bestDir.y;
    };

    drag.addMoveFn(fn);

    return () => {
      drag.removeMoveFn(fn);
    };
  }
}

export class DragInvokerOfMultiSelect extends DragableInvoker {
  constructor() {
    super();
    this.selected = new Set();
  }
  select(drag) {
    this.selected.add(drag);
    super.add(drag);
  }
  unselect(drag) {
    this.selected.delete(drag);
    super.removeLimit(drag);
  }
  clearSelect() {
    this.selected.clear();
    super.removeAll();
  }

  limit(moveDrag) {
    const fn = (_, state) => {
      this.selected.forEach((dragInstance) => {
        //单例模式
        if (dragInstance instanceof ShareDragable) {
          const elList=dragInstance.shareElList
        } else {
        }
      });
    };
    mainDrag.addMoveFn(fn);
    return () => mainDrag.removeMoveFn(fn);
  }
  add() {
    throw new Error("Subclasses should not use this method any longer");
  }
  removeAll() {
    throw new Error("Subclasses should not use this method any longer");
  }
  beforeAdd() {
    throw new Error("Subclasses should not use this method any longer");
  }
  removeLimit() {
    throw new Error("Subclasses should not use this method any longer");
  }
}
