import { registerRotatorScript } from './../rotator.js';
import { registerARScript } from './../arBasic.js';
import { registerOrbitCameraScript, registerOrbitCameraInputMouseScript, registerOrbitCameraInputTouchScript } from './../orbit-camera.js';


const canvas = document.getElementById("modelContainer");
const app = new pc.Application(canvas, { mouse: new pc.Mouse(canvas), touch: new pc.TouchDevice(canvas) });
registerRotatorScript(app);
registerARScript(app);
registerOrbitCameraScript(app);
registerOrbitCameraInputMouseScript(app);
registerOrbitCameraInputTouchScript(app);

function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
}

// Set resolution and fill mode based on device type
if (isMobileDevice()) {
    app.setCanvasResolution(pc.RESOLUTION_FIXED, 720, 1280);
} else {
    app.setCanvasFillMode(pc.FILLMODE_KEEP_ASPECT);
    app.setCanvasResolution(pc.RESOLUTION_FIXED, 2560, 1440);
}

// Start the application
app.start();

// Add a light source
var light = new pc.Entity('light');
light.addComponent('light');
light.setLocalEulerAngles(90, 0, 0);
app.root.addChild(light);

// Add a GSplat entity
var entity = new pc.Entity();
app.root.addChild(entity);
entity.addComponent('gsplat', {
    // GSplat-related properties
});
var material = new pc.StandardMaterial();
material.opacity = 1; // 完全不透明
material.blendType = pc.BLEND_NONE; // ブレンディングを無効化
entity.gsplat.instance?.materisl = material;
// Add a camera
var camera = new pc.Entity('camera');
camera.addComponent('camera', {});
camera.addComponent('script');
camera.script.create('orbitCamera', {
    attributes: {
        distanceMin: 6
    }
});
camera.script.create('orbitCameraInputMouse');
camera.script.create('orbitCameraInputTouch');
camera.camera.clearColor = new pc.Color(0, 0, 0, 0);
// カメラ用レイヤー設定
const worldLayer = app.scene.layers.getLayerByName("World");
camera.camera.layers = [worldLayer.id];

app.root.addChild(camera);

// Load the model
app.assets.loadFromUrl(modelUrl, 'gsplat', function (err, asset) {
    if (err) {
        console.error('Failed to load model:', err);
        return;
    }
    entity.gsplat.asset = asset;
});

// Start AR mode
document.getElementById('start-ar').addEventListener('click', function () {
    if (app.xr.isAvailable(pc.XRTYPE_AR)) {
        camera.camera.startXr(pc.XRTYPE_AR, pc.XRSPACE_LOCALFLOOR).then(() => {
            console.log("ARモードが開始されました");
            entity.setLocalScale(0.1, 0.1, 0.1);
            // Listen for touch events
            app.touch.on('touchstart', function (event) {
                const touchX = event.touches[0].x;
                const touchY = event.touches[0].y;

                // Perform hit testing
                const session = app.xr.session;
                const xrFrame = app.xr.frame;
                const referenceSpace = session.referenceSpace;

                const viewerSpace = session.viewerSpace;
                xrFrame.requestHitTestSource({ space: viewerSpace }).then((hitTestSource) => {
                    const hitResults = xrFrame.getHitTestResults(hitTestSource);
                    if (hitResults.length > 0) {
                        const hitPose = hitResults[0].getPose(referenceSpace);
                        if (hitPose) {
                            // Place model at hit position
                            entity.setPosition(
                                hitPose.transform.position.x,
                                hitPose.transform.position.y,
                                hitPose.transform.position.z
                            );
                        }
                    }
                }).catch((err) => {
                    console.error("ヒットテストの失敗:", err);
                });
            });
        }).catch((err) => {
            console.error("ARモードの開始に失敗しました:", err);
        });
    } else {
        console.warn("WebXR (AR) が利用できません");
    }
});

app.on('update', function (dt) {
    // Scene updates and animations
});