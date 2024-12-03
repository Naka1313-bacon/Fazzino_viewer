export function registerOrbitCameraScript() {
    var OrbitCamera = pc.createScript('orbitCamera');

    OrbitCamera.attributes.add('distanceMax', { type: 'number', default: 80, title: 'Distance Max', description: 'Setting this at 0 will give an infinite distance limit' });
    OrbitCamera.attributes.add('distanceMin', { type: 'number', default: 60, title: 'Distance Min' });
    OrbitCamera.attributes.add('pitchAngleMax', { type: 'number', default: 30, title: 'Pitch Angle Max (degrees)' });
    OrbitCamera.attributes.add('pitchAngleMin', { type: 'number', default: 0, title: 'Pitch Angle Min (degrees)' });
    
    OrbitCamera.attributes.add('inertiaFactor', {
        type: 'number',
        default: 0,
        title: 'Inertia Factor',
        description: 'Higher value means that the camera will continue moving after the user has stopped dragging. 0 is fully responsive.'
    });

    OrbitCamera.attributes.add('focusEntity', {
        type: 'entity',
        title: 'Focus Entity',
        description: 'Entity for the camera to focus on. If blank, then the camera will use the whole scene'
    });

    OrbitCamera.attributes.add('frameOnStart', {
        type: 'boolean',
        default: true,
        title: 'Frame on Start',
        description: 'Frames the entity or scene at the start of the application."'
    });

    OrbitCamera.attributes.add('yawAngleMin', {
        type: 'number',
        default: -60, // Restrict to -90 degrees by default
        title: 'Yaw Angle Min (degrees)'
    });

    OrbitCamera.attributes.add('yawAngleMax', {
        type: 'number',
        default: 60, // Restrict to 90 degrees by default
        title: 'Yaw Angle Max (degrees)'
    });

    Object.defineProperty(OrbitCamera.prototype, "distance", {
        get: function () {
            return this._targetDistance;
        },
        set: function (value) {
            this._targetDistance = this._clampDistance(value);
        }
    });

    Object.defineProperty(OrbitCamera.prototype, "orthoHeight", {
        get: function () {
            return this.entity.camera.orthoHeight;
        },
        set: function (value) {
            this.entity.camera.orthoHeight = Math.max(0, value);
        }
    });

    Object.defineProperty(OrbitCamera.prototype, "pitch", {
        get: function () {
            return this._targetPitch;
        },
        set: function (value) {
            this._targetPitch = this._clampPitchAngle(value);
        }
    });

    Object.defineProperty(OrbitCamera.prototype, "yaw", {
        get: function () {
            return this._targetYaw;
        },
        set: function (value) {
            // Clamp yaw within the allowed range
            this._targetYaw = pc.math.clamp(value, this.yawAngleMin, this.yawAngleMax);
    
            var diff = this._targetYaw - this._yaw;
            var reminder = diff % 360;
            if (reminder > 180) {
                this._targetYaw = this._yaw - (360 - reminder);
            } else if (reminder < -180) {
                this._targetYaw = this._yaw + (360 + reminder);
            } else {
                this._targetYaw = this._yaw + reminder;
            }
        }
    });
    

    Object.defineProperty(OrbitCamera.prototype, "pivotPoint", {
        get: function () {
            return this._pivotPoint;
        },
        set: function (value) {
            this._pivotPoint.copy(value);
        }
    });

    OrbitCamera.prototype.focus = function (focusEntity) {
        this._buildAabb(focusEntity);

        var halfExtents = this._modelsAabb.halfExtents;
        var radius = Math.max(halfExtents.y, Math.max(halfExtents.y, halfExtents.z));

        this.distance = (radius * 1.5) / Math.sin(0.5 * this.entity.camera.fov * pc.math.DEG_TO_RAD);

        this._removeInertia();

        this._pivotPoint.copy(this._modelsAabb.center);
    };

    OrbitCamera.distanceBetween = new pc.Vec3();

    OrbitCamera.prototype.resetAndLookAtPoint = function (resetPoint, lookAtPoint) {
        this.pivotPoint.copy(lookAtPoint);
        this.entity.setPosition(resetPoint);

        this.entity.lookAt(lookAtPoint);

        var distance = OrbitCamera.distanceBetween;
        distance.sub2(lookAtPoint, resetPoint);
        this.distance = distance.length();

        this.pivotPoint.copy(lookAtPoint);

        var cameraQuat = this.entity.getRotation();
        this.yaw = this._calcYaw(cameraQuat);
        this.pitch = this._calcPitch(cameraQuat, this.yaw);

        this._removeInertia();
        this._updatePosition();
    };

    OrbitCamera.prototype.resetAndLookAtEntity = function (resetPoint, entity) {
        this._buildAabb(entity);
        this.resetAndLookAtPoint(resetPoint, this._modelsAabb.center);
    };

    OrbitCamera.prototype.reset = function (yaw, pitch, distance) {
        this.pitch = pitch;
        this.yaw = yaw;
        this.distance = distance;

        this._removeInertia();
    };

    OrbitCamera.prototype.initialize = function () {
        var self = this;
        var onWindowResize = function () {
            self._checkAspectRatio();
        };

        window.addEventListener('resize', onWindowResize, false);

        this._checkAspectRatio();

        this._modelsAabb = new pc.BoundingBox();
        this._buildAabb(this.focusEntity || this.app.root);

        this.entity.lookAt(this._modelsAabb.center);

        this._pivotPoint = new pc.Vec3();
        this._pivotPoint.copy(this._modelsAabb.center);

        var cameraQuat = this.entity.getRotation();

        this._yaw = this._calcYaw(cameraQuat);
        this._pitch = this._clampPitchAngle(this._calcPitch(cameraQuat, this._yaw));
        this.entity.setLocalEulerAngles(this._pitch, this._yaw, 0);

        this._distance = 0;

        this._targetYaw = this._yaw;
        this._targetPitch = this._pitch;

        if (this.frameOnStart) {
            this.focus(this.focusEntity || this.app.root);
        } else {
            var distanceBetween = new pc.Vec3();
            distanceBetween.sub2(this.entity.getPosition(), this._pivotPoint);
            this._distance = this._clampDistance(distanceBetween.length());
        }

        this._targetDistance = this._distance;
        
        this.on('attr:distanceMin', function (value, prev) {
            this._distance = this._clampDistance(this._distance);
        });

        this.on('attr:distanceMax', function (value, prev) {
            this._distance = this._clampDistance(this._distance);
        });

        this.on('attr:pitchAngleMin', function (value, prev) {
            this._pitch = this._clampPitchAngle(this._pitch);
        });

        this.on('attr:pitchAngleMax', function (value, prev) {
            this._pitch = this._clampPitchAngle(this._pitch);
        });

        this.on('attr:focusEntity', function (value, prev) {
            if (this.frameOnStart) {
                this.focus(value || this.app.root);
            } else {
                this.resetAndLookAtEntity(this.entity.getPosition(), value || this.app.root);
            }
        });

        this.on('attr:frameOnStart', function (value, prev) {
            if (value) {
                this.focus(this.focusEntity || this.app.root);
            }
        });

        this.on('destroy', function () {
            window.removeEventListener('resize', onWindowResize, false);
        });
    };

    OrbitCamera.prototype.update = function (dt) {
        var t = this.inertiaFactor === 0 ? 1 : Math.min(dt / this.inertiaFactor, 1);
        this._distance = pc.math.lerp(this._distance, this._targetDistance, t);
        this._yaw = pc.math.lerp(this._yaw, this._targetYaw, t);
        this._pitch = pc.math.lerp(this._pitch, this._targetPitch, t);

        this._updatePosition();
    };

    OrbitCamera.prototype._updatePosition = function () {
        this.entity.setLocalPosition(0, 0, 0);
        this.entity.setLocalEulerAngles(this._pitch, this._yaw, 0);

        var position = this.entity.getPosition();
        position.copy(this.entity.forward);
        position.mulScalar(-this._distance);
        position.add(this.pivotPoint);
        this.entity.setPosition(position);
    };

    OrbitCamera.prototype._removeInertia = function () {
        this._yaw = this._targetYaw;
        this._pitch = this._targetPitch;
        this._distance = this._targetDistance;
    };

    OrbitCamera.prototype._checkAspectRatio = function () {
        var height = this.app.graphicsDevice.height;
        var width = this.app.graphicsDevice.width;

        this.entity.camera.horizontalFov = height > width;
    };

    OrbitCamera.prototype._buildAabb = function (entity) {
        var i, m, meshInstances = [];

        var renders = entity.findComponents("render");
        for (i = 0; i < renders.length; i++) {
            var render = renders[i];
            for (m = 0; m < render.meshInstances.length; m++) {
                meshInstances.push(render.meshInstances[m]);
            }
        }

        var models = entity.findComponents("model");
        for (i = 0; i < models.length; i++) {
            var model = models[i];
            for (m = 0; m < model.meshInstances.length; m++) {
                meshInstances.push(model.meshInstances[m]);
            }
        }

        var gsplats = entity.findComponents("gsplat");
        for (i = 0; i < gsplats.length; i++) {
            var gsplat = gsplats[i];
            var instance = gsplat.instance;
            if (instance?.meshInstance) {
                meshInstances.push(instance.meshInstance);
            }
        }

        for (i = 0; i < meshInstances.length; i++) {
            if (i === 0) {
                this._modelsAabb.copy(meshInstances[i].aabb);
            } else {
                this._modelsAabb.add(meshInstances[i].aabb);
            }
        }
    };

    OrbitCamera.prototype._calcYaw = function (quat) {
        var transformedForward = new pc.Vec3();
        quat.transformVector(pc.Vec3.FORWARD, transformedForward);

        return Math.atan2(-transformedForward.x, -transformedForward.z) * pc.math.RAD_TO_DEG;
    };

    OrbitCamera.prototype._clampDistance = function (distance) {
        if (this.distanceMax > 0) {
            return pc.math.clamp(distance, this.distanceMin, this.distanceMax);
        }
        return Math.max(distance, this.distanceMin);
    };

    OrbitCamera.prototype._clampPitchAngle = function (pitch) {
        return pc.math.clamp(pitch, -this.pitchAngleMax, -this.pitchAngleMin);
    };

    OrbitCamera.quatWithoutYaw = new pc.Quat();
    OrbitCamera.yawOffset = new pc.Quat();

    OrbitCamera.prototype._calcPitch = function (quat, yaw) {
        var quatWithoutYaw = OrbitCamera.quatWithoutYaw;
        var yawOffset = OrbitCamera.yawOffset;

        yawOffset.setFromEulerAngles(0, -yaw, 0);
        quatWithoutYaw.mul2(yawOffset, quat);

        var transformedForward = new pc.Vec3();

        quatWithoutYaw.transformVector(pc.Vec3.FORWARD, transformedForward);

        return Math.atan2(transformedForward.y, -transformedForward.z) * pc.math.RAD_TO_DEG;
    };
}

export function registerOrbitCameraInputMouseScript() {
    var OrbitCameraInputMouse = pc.createScript('orbitCameraInputMouse');

    OrbitCameraInputMouse.attributes.add('orbitSensitivity', {
        type: 'number',
        default: 0.3,
        title: 'Orbit Sensitivity',
        description: 'How fast the camera moves around the orbit. Higher is faster'
    });

    OrbitCameraInputMouse.attributes.add('distanceSensitivity', {
        type: 'number',
        default: 0.15,
        title: 'Distance Sensitivity',
        description: 'How fast the camera moves in and out. Higher is faster'
    });

    OrbitCameraInputMouse.prototype.initialize = function () {
        this.orbitCamera = this.entity.script.orbitCamera;

        if (this.orbitCamera) {
            var self = this;

            var onMouseOut = function (e) {
                self.onMouseOut(e);
            };

            this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
            this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
            this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
            this.app.mouse.on(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);

            window.addEventListener('mouseout', onMouseOut, false);

            this.on('destroy', function () {
                this.app.mouse.off(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
                this.app.mouse.off(pc.EVENT_MOUSEUP, this.onMouseUp, this);
                this.app.mouse.off(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
                this.app.mouse.off(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);

                window.removeEventListener('mouseout', onMouseOut, false);
            });
        }

        this.app.mouse.disableContextMenu();

        this.lookButtonDown = false;
        this.panButtonDown = false;
        this.lastPoint = new pc.Vec2();
    };

    OrbitCameraInputMouse.prototype.pan = function (screenPoint) {
        var fromWorldPoint = OrbitCameraInputMouse.fromWorldPoint;
        var toWorldPoint = OrbitCameraInputMouse.toWorldPoint;
        var worldDiff = OrbitCameraInputMouse.worldDiff;

        var camera = this.entity.camera;
        var distance = this.orbitCamera.distance;

        camera.screenToWorld(screenPoint.x, screenPoint.y, distance, fromWorldPoint);
        camera.screenToWorld(this.lastPoint.x, this.lastPoint.y, distance, toWorldPoint);

        worldDiff.sub2(toWorldPoint, fromWorldPoint);

        this.orbitCamera.pivotPoint.add(worldDiff);
    };

    OrbitCameraInputMouse.prototype.onMouseDown = function (event) {
        switch (event.button) {
            case pc.MOUSEBUTTON_LEFT:
                this.lookButtonDown = true;
                break;
            case pc.MOUSEBUTTON_MIDDLE:
            case pc.MOUSEBUTTON_RIGHT:
                this.panButtonDown = true;
                break;
        }
    };

    OrbitCameraInputMouse.prototype.onMouseUp = function (event) {
        switch (event.button) {
            case pc.MOUSEBUTTON_LEFT:
                this.lookButtonDown = false;
                break;
            case pc.MOUSEBUTTON_MIDDLE:
            case pc.MOUSEBUTTON_RIGHT:
                this.panButtonDown = false;
                break;
        }
    };

    OrbitCameraInputMouse.prototype.onMouseMove = function (event) {
        if (this.lookButtonDown) {
            this.orbitCamera.pitch -= event.dy * this.orbitSensitivity;
            this.orbitCamera.yaw -= event.dx * this.orbitSensitivity; 
        } else if (this.panButtonDown) {
            this.pan(event);
        }

        this.lastPoint.set(event.x, event.y);
    };

    OrbitCameraInputMouse.prototype.onMouseWheel = function (event) {
        if (this.entity.camera.projection === pc.PROJECTION_PERSPECTIVE) {
            this.orbitCamera.distance -= event.wheel * this.distanceSensitivity * (this.orbitCamera.distance * 0.1);
        } else {
            this.orbitCamera.orthoHeight -= event.wheel * this.distanceSensitivity;
        }
        event.event.preventDefault();
    };

    OrbitCameraInputMouse.prototype.onMouseOut = function (event) {
        this.lookButtonDown = false;
        this.panButtonDown = false;
    };
}

export function registerOrbitCameraInputTouchScript() {
    var OrbitCameraInputTouch = pc.createScript('orbitCameraInputTouch');

    OrbitCameraInputTouch.attributes.add('orbitSensitivity', {
        type: 'number',
        default: 0.4,
        title: 'Orbit Sensitivity',
        description: 'How fast the camera moves around the orbit. Higher is faster'
    });

    OrbitCameraInputTouch.attributes.add('distanceSensitivity', {
        type: 'number',
        default: 0.2,
        title: 'Distance Sensitivity',
        description: 'How fast the camera moves in and out. Higher is faster'
    });

    OrbitCameraInputTouch.prototype.initialize = function () {
        this.orbitCamera = this.entity.script.orbitCamera;

        this.lastTouchPoint = new pc.Vec2();
        this.lastPinchMidPoint = new pc.Vec2();
        this.lastPinchDistance = 0;

        if (this.orbitCamera && this.app.touch) {
            this.app.touch.on(pc.EVENT_TOUCHSTART, this.onTouchStartEndCancel, this);
            this.app.touch.on(pc.EVENT_TOUCHEND, this.onTouchStartEndCancel, this);
            this.app.touch.on(pc.EVENT_TOUCHCANCEL, this.onTouchStartEndCancel, this);

            this.app.touch.on(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);

            this.on('destroy', function () {
                this.app.touch.off(pc.EVENT_TOUCHSTART, this.onTouchStartEndCancel, this);
                this.app.touch.off(pc.EVENT_TOUCHEND, this.onTouchStartEndCancel, this);
                this.app.touch.off(pc.EVENT_TOUCHCANCEL, this.onTouchStartEndCancel, this);

                this.app.touch.off(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);
            });
        }
    };

    OrbitCameraInputTouch.prototype.getPinchDistance = function (pointA, pointB) {
        var dx = pointA.x - pointB.x;
        var dy = pointA.y - pointB.y;

        return Math.sqrt((dx * dx) + (dy * dy));
    };

    OrbitCameraInputTouch.prototype.calcMidPoint = function (pointA, pointB, result) {
        result.set(pointB.x - pointA.x, pointB.y - pointA.y);
        result.mulScalar(0.5);
        result.x += pointA.x;
        result.y += pointA.y;
    };

    OrbitCameraInputTouch.prototype.onTouchStartEndCancel = function (event) {
        var touches = event.touches;
        if (touches.length === 1) {
            this.lastTouchPoint.set(touches[0].x, touches[0].y);
        } else if (touches.length === 2) {
            this.lastPinchDistance = this.getPinchDistance(touches[0], touches[1]);
            this.calcMidPoint(touches[0], touches[1], this.lastPinchMidPoint);
        }
    };

    OrbitCameraInputTouch.prototype.pan = function (midPoint) {
        var fromWorldPoint = OrbitCameraInputTouch.fromWorldPoint;
        var toWorldPoint = OrbitCameraInputTouch.toWorldPoint;
        var worldDiff = OrbitCameraInputTouch.worldDiff;

        var camera = this.entity.camera;
        var distance = this.orbitCamera.distance;

        camera.screenToWorld(midPoint.x, midPoint.y, distance, fromWorldPoint);
        camera.screenToWorld(this.lastPinchMidPoint.x, this.lastPinchMidPoint.y, distance, toWorldPoint);

        worldDiff.sub2(toWorldPoint, fromWorldPoint);

        this.orbitCamera.pivotPoint.add(worldDiff);
    };

    OrbitCameraInputTouch.prototype.onTouchMove = function (event) {
        var pinchMidPoint = OrbitCameraInputTouch.pinchMidPoint;

        var touches = event.touches;
        if (touches.length === 1) {
            var touch = touches[0];

            this.orbitCamera.pitch -= (touch.y - this.lastTouchPoint.y) * this.orbitSensitivity;
            this.orbitCamera.yaw -= (touch.x - this.lastTouchPoint.x) * this.orbitSensitivity; 


            this.lastTouchPoint.set(touch.x, touch.y);
        } else if (touches.length === 2) {
            var currentPinchDistance = this.getPinchDistance(touches[0], touches[1]);
            var diffInPinchDistance = currentPinchDistance - this.lastPinchDistance;
            this.lastPinchDistance = currentPinchDistance;

            this.orbitCamera.distance -= (diffInPinchDistance * this.distanceSensitivity * 0.1) * (this.orbitCamera.distance * 0.1);

            this.calcMidPoint(touches[0], touches[1], pinchMidPoint);
            this.pan(pinchMidPoint);
            this.lastPinchMidPoint.copy(pinchMidPoint);
        }
    };
}
