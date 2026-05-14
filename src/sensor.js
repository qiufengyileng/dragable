//统一的传感器类，合并统一移动端的触摸滑动事件和浏览器的移动点击事件
//在这里会定义具体传感器要实现（或者对应的方法）
const EVENT_TYPE = {
    CLICK: "click",
    MOVE: "move",
    CLICK_DOWN: "clickDown",
    CLICK_UP: "clickUp",

}
const EVENT_TYPE_SET = new Set(Object.values(EVENT_TYPE));
class Sensor {
    constructor(target) {
        this.target = target; //el元素
        this.eventType = EVENT_TYPE;
        this.eventBus = new Emitter();
    }
    addSensorListener(eventType, listener) {
        if (!this.isLegal(eventType)) return () => { }
        console.log(this.constructor.name);
        return this.eventBus.on(eventType, listener);
    }
    addOnceSensorListener(eventType, listener) {
        if (!this.isLegal(eventType)) return () => { }
        return this.eventBus.once(eventType, listener);
    }
    removeSensorListener(eventType, listener) {
        this.eventBus.remove(eventType, listener);
    }
    dispatchSensorEvent(eventType) {
        this.eventBus.emit(eventType);
    }
    isLegal(eventType) {
        return !!eventType && EVENT_TYPE_SET.has(eventType);
    }
    hasRegistry(type) {
        return this.eventBus.hasRegistry(type);
    }
}

/**
 * @description 指针传感器，用于处理浏览器的鼠标点击事件
 * */
class PointerSensor extends Sensor {
    static POINTER_EVENT_MAP = {
        [EVENT_TYPE.CLICK]: "click",
        [EVENT_TYPE.MOVE]: "mousemove",
        [EVENT_TYPE.CLICK_DOWN]: "mousedown",
        [EVENT_TYPE.CLICK_UP]: "mouseup",

    }
    constructor(target) {
        super(target);
        this.OriginalEventBus = new Emitter();

    }
    addSensorListener(eventType, listener) {
        debugger
        this._addListener(eventType)
        const removeListener = super.addSensorListener(eventType, listener);

        return () => {
            removeListener();
        }
    }
    addOnceSensorListener(eventType, listener) {
        this._addListener(eventType)
        const removeListener = super.addOnceSensorListener(eventType, listener);

        return () => {
            removeListener();
        }
    }
    removeSensorListener(eventType, listener) {
        super.removeSensorListener(eventType, listener);
        if (!this.hasRegistry(eventType)) {
            this._removeListener(eventType)
        }
    }

    _addListener(eventType) {
        if(!this.isLegal(eventType)) return;
        const callback = () => this.dispatchSensorEvent(eventType);
        if (!this.hasRegistry(eventType)) {
            this.target.addEventListener(PointerSensor.POINTER_EVENT_MAP[eventType], callback)
            this.OriginalEventBus.once(eventType, () => this.target.removeEventListener(PointerSensor.POINTER_EVENT_MAP[eventType], callback))
        }
    }
    _removeListener(eventType) {
        this.OriginalEventBus.emit(eventType)
    }



}



/**
 * @description 触摸传感器，用于处理移动端的触摸滑动事件
 * */
class TouchSensor extends Sensor {
    static TOUCH_EVENT_MAP = {
        [EVENT_TYPE.MOVE]: "touchmove",
        [EVENT_TYPE.CLICK_DOWN]: "touchstart",
        [EVENT_TYPE.CLICK_UP]: "touchend",
    }
    constructor(target) {
        super(target);
        this.OriginalEventBus = new Emitter();
    }

    addSensorListener(eventType, listener) {
        this._addListener(eventType)
        const removeListener = super.addSensorListener(eventType, listener);

        return () => {
            removeListener();
        }
    }
    addOnceSensorListener(eventType, listener) {
        this._addListener(eventType)
        const removeListener = super.addOnceSensorListener(eventType, listener);

        return () => {
            removeListener();

        }
    }

    removeSensorListener(eventType, listener) {
        super.removeSensorListener(eventType, listener);
        if (!this.hasRegistry(eventType)) {
            this._removeListener(eventType)
        }
    }

    _addListener(eventType) {
        if(!this.isLegal(eventType)) return;
        const callback = () => this.dispatchSensorEvent(eventType);
        if (!this.hasRegistry(eventType)) {
            this.target.addEventListener(TouchSensor.TOUCH_EVENT_MAP[eventType], callback)
            this.OriginalEventBus.once(eventType, () => this.target.removeEventListener(TouchSensor.TOUCH_EVENT_MAP[eventType], callback))
        }
    }
    _removeListener(eventType) {
        this.OriginalEventBus.emit(eventType)
    }

}



class Emitter {
    constructor() {
        this.registrySet = new Set();
        this.eventCallbackMap = new Map();
    }
    on(type, callback) {
        if (typeof callback !== 'function') return () => { };
        if (!this.hasRegistry(type)) this._registryEvent(type);
        this.eventCallbackMap.get(type).add(callback);
        return () => {
            this.remove(type, callback);
        }
    }
    emit(type) {
        this.eventCallbackMap.get(type)?.forEach(callback => callback(type));
    }
    once(type, callback) {
        const _callback = () => {
            try {
                callback(type);
            } finally {
                this.remove(type, _callback);
            }
        }
        return this.on(type, _callback);

    }
    remove(type, callback) {
        const callbackSet = this.eventCallbackMap.get(type);
        callbackSet?.delete(callback);
        if (callbackSet?.size === 0) {
            this.registrySet.delete(type);
            this.eventCallbackMap.delete(type);
        }
    }
    reset() {
        this.eventCallbackMap = new Map();
        this.registrySet = new Set();
    }
    _registryEvent(type) {
        if (!this.hasRegistry(type)) {
            this.registrySet.add(type);
            this.eventCallbackMap.set(type, new Set());
        }
    }
    hasRegistry(type) {
        return this.registrySet.has(type);
    }


}