//统一的传感器类，合并统一移动端的触摸滑动事件和浏览器的移动点击事件
//在这里会定义具体传感器要实现（或者对应的方法）
const EVENT_TYPE = {
    CLICK: "click",
    MOVE: "move",
    CLICK_DOWN: "clickDown",
    CLICK_UP: "clickUp",
    DOUBLE_CLICK: "doubleClick",
}
class Sensor {
    constructor() {
        this.eventType = EVENT_TYPE;
        this.eventBus = new Emitter();
    }
    addSensorListener(target, eventType, listener) {
        if (!this._isLegal(eventType)) return;
        return this.eventBus.on(target, eventType, listener);
    }
    addOnceSensorListener(target, eventType, listener) {
        if (!this._isLegal(eventType)) return;
        return this.eventBus.once(target, eventType, listener);
    }
    removeSensorListener(target, eventType, listener) {
        this.eventBus.remove(target, eventType, listener);
    }
    dispatchSensorEvent(target, eventType) {
        this.eventBus.emit(target, eventType);
    }
    _isLegal(eventType) {
        return !!eventType && Object.values(this.eventType).includes(eventType);
    }

}

/**
 * @description 指针传感器，用于处理浏览器的鼠标点击事件
 * */
class PointerSensor extends Sensor {
    static POINTER_EVENT_MAP = {
        [eventType.CLICK]: "click",
        [eventType.MOVE]: "mousemove",
        [eventType.CLICK_DOWN]: "mousedown",
        [eventType.CLICK_UP]: "mouseup",
        [eventType.DOUBLE_CLICK]: "dblclick",
    }
    constructor() {
        super();

    }
    addSensorListener(target, eventType, listener) {
        const removeListener = super.addSensorListener(target, eventType, listener);
        const _removeListener = document.addEventListener(this.POINTER_EVENT_MAP[eventType], this.dispatchSensorEvent(target, eventType));
        return () => {
            removeListener();
            _removeListener();
        }
    }
    addOnceSensorListener(target, eventType, listener) {
        const removeListener = super.addOnceSensorListener(target, eventType, listener);
        const _removeListener = document.addEventListener(this.POINTER_EVENT_MAP[eventType], this.dispatchSensorEvent(target, eventType));
        return () => {
            removeListener();
            _removeListener();
        }
    }
    removeSensorListener(target, eventType, listener) {
        super.removeSensorListener(target, eventType, listener);
        document.removeEventListener(this.POINTER_EVENT_MAP[eventType], this.dispatchSensorEvent(target, eventType));
    }
}



/**
 * @description 触摸传感器，用于处理移动端的触摸滑动事件
 * */
class TouchSensor extends Sensor {
    static TOUCH_EVENT_MAP = {
        [eventType.MOVE]: "touchmove",
        [eventType.CLICK_DOWN]: "touchstart",
        [eventType.CLICK_UP]: "touchend",
        [eventType.DOUBLE_CLICK]: "touchdblclick",
    }
    constructor() {
        super();
    }

    addSensorListener(target, eventType, listener) {
        const removeListener = super.addSensorListener(target, eventType, listener);
        const _removeListener = document.addEventListener(this.TOUCH_EVENT_MAP[eventType], this.dispatchSensorEvent(target, eventType));
        return () => {
            removeListener();
            _removeListener();
        }
    }
    addOnceSensorListener(target, eventType, listener) {
        const removeListener = super.addOnceSensorListener(target, eventType, listener);
        const _removeListener = document.addEventListener(this.TOUCH_EVENT_MAP[eventType], this.dispatchSensorEvent(target, eventType));
        return () => {
            removeListener();
            _removeListener();
        }
    }
    removeSensorListener(target, eventType, listener) {
        super.removeSensorListener(target, eventType, listener);
        document.removeEventListener(this.TOUCH_EVENT_MAP[eventType], this.dispatchSensorEvent(target, eventType));
    }
}



class Emitter {
    constructor() {
        this.eventCallbackMap = new WeakMap();
    }
    on(target, type, callback) {
        if (typeof callback !== 'function') return () => { };
        const callbackSet = this._createCallbackSet(target, type);
        callbackSet.add(callback);
        return () => {
            this.remove(target, type, callback);
        }
    }
    emit(target, type) {
        this._findCallbackSet(target, type)?.forEach(callback => callback(type));
    }
    once(target, type, callback) {
        const _callback = () => {
            try {
                callback(type);
            } finally {
                this.remove(target, type, _callback);
            }
        }
        return this.on(target, type, _callback);

    }
    remove(target, type, callback) {
        const callbackSet = this._findCallbackSet(target, type)
        callbackSet?.delete(callback);
        if (callbackSet?.size === 0) {
            this.eventCallbackMap?.get(target)?.delete(type);
        }
        if (this.eventCallbackMap?.get(target)?.size === 0) {
            this.eventCallbackMap?.delete(target);
        }

    }
    reset() {
        this.eventCallbackMap = new WeakMap();
    }

    _findCallbackSet(target, type) {
        if (!this.eventCallbackMap.has(target)) return;
        const targetMap = this.eventCallbackMap.get(target);
        if (!targetMap.has(type)) return;
        return targetMap.get(type);
    }
    _createCallbackSet(target, type) {
        if (!this.eventCallbackMap.has(target)) this.eventCallbackMap.set(target, new Map());
        const targetMap = this.eventCallbackMap.get(target);
        if (!targetMap.has(type)) targetMap.set(type, new Set());
        return targetMap.get(type);
    }

}