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

const worldLayer = app.scene.layers.getLayerByName("World");
camera.camera.layers = [worldLayer.id];

app.root.addChild(camera);

// Load the model
// modelUrlは適宜定義されていると仮定
app.assets.loadFromUrl(modelUrl, 'gsplat', function (err, asset) {
    if (err) {
        console.error('Failed to load model:', err);
        return;
    }
    entity.gsplat.asset = asset;
});

// AR用変数
let hitTestSource = null;
let viewerSpace = null;
let localReferenceSpace = null;
let placeModelRequested = false; // タッチでモデルを配置したいことを示すフラグ

document.getElementById('start-ar').addEventListener('click', function () {
    if (app.xr.isAvailable(pc.XRTYPE_AR)) {
        camera.camera.startXr(pc.XRTYPE_AR, pc.XRSPACE_LOCALFLOOR);

        // ARセッション開始時
        app.xr.on('start', async function () {
            console.log("ARセッションが開始されました");
            const session = app.xr.session;

            // viewerスペースを確保
            viewerSpace = await session.requestReferenceSpace('viewer');
            // local-floorのリファレンススペースも再取得（PlayCanvasが内部で行っているはずですが明示的に行う例）
            localReferenceSpace = await session.requestReferenceSpace('local-floor');

            // ヒットテストソースの設定
            try {
                hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
            } catch (err) {
                console.error("ヒットテストソース取得エラー:", err);
            }

            // タッチイベント：モデル配置要求をフラグで制御する
            app.touch.on(pc.EVENT_TOUCHSTART, function (event) {
                const touch = event.touches[0];
                console.log(`タッチ開始: x=${touch.x}, y=${touch.y}`);
                // ここではただフラグを立てる
                placeModelRequested = true;
            });
        });

        // ARセッション中に毎フレーム呼ばれるイベント
        app.xr.on('update', function (xrFrame) {
            if (!hitTestSource || !xrFrame) return;

            const hitResults = xrFrame.getHitTestResults(hitTestSource);
            if (hitResults.length > 0) {
                const hitPose = hitResults[0].getPose(localReferenceSpace);
                if (placeModelRequested && hitPose) {
                    // ヒットポーズが得られたらモデル配置
                    entity.setPosition(
                        hitPose.transform.position.x,
                        hitPose.transform.position.y,
                        hitPose.transform.position.z
                    );

                    console.log("モデル配置位置:", hitPose.transform.position);
                    placeModelRequested = false; // フラグリセット
                }
            }
        });

        app.xr.on('end', function () {
            console.log("ARセッションが終了しました");
            hitTestSource = null;
            viewerSpace = null;
            localReferenceSpace = null;
            placeModelRequested = false;
        });
    } else {
        console.warn("WebXR (AR) が利用できません");
    }
});

// 通常のシーン更新
app.on('update', function (dt) {
    // Scene updates and animations
});
