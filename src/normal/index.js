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

// Add a GSplat entity (the main model entity)
var entity = new pc.Entity();
app.root.addChild(entity);
entity.addComponent('gsplat', {
    // GSplat-related properties
});
entity.enabled = false; // 初期は非表示

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
// modelUrlは適宜定義されている前提
app.assets.loadFromUrl(modelUrl, 'gsplat', function (err, asset) {
    if (err) {
        console.error('Failed to load model:', err);
        return;
    }
    entity.gsplat.asset = asset;
});
const material = new pc.StandardMaterial();
material.opacity = 1.0;          // 不透明
material.blendType = pc.BLEND_NONE; // ブレンド無効化（不透明描画）
material.update();

asset.ready(function (resource) {
    entity.gsplat.instance.material = material;
    }
);
let hitTestSource = null;
let localReferenceSpace = null;
let placeModelRequested = false; 

// Reticle (レティクル)用エンティティを作成
const reticle = new pc.Entity("reticle");
reticle.enabled = false; // 初期は非表示
reticle.addComponent('model', {
    type: 'plane'
});
const reticleMat = new pc.StandardMaterial();
reticleMat.diffuse = new pc.Color(1, 1, 1);
reticleMat.opacity = 0.5; // 半透明
reticleMat.update();
reticle.model.material = reticleMat;
reticle.setLocalScale(0.2, 0.2, 0.2);
app.root.addChild(reticle);

// AR開始ボタン
document.getElementById('start-ar').addEventListener('click', function () {
    if (app.xr.isAvailable(pc.XRTYPE_AR)) {
        camera.camera.startXr(pc.XRTYPE_AR, pc.XRSPACE_LOCALFLOOR, {
            requiredFeatures: ['hit-test'] // ヒットテストが必須
        });

        app.xr.on('start', async function () {
            console.log("ARセッションが開始されました");
            const session = app.xr.session;

            const viewerSpace = await session.requestReferenceSpace('viewer');
            localReferenceSpace = await session.requestReferenceSpace('local-floor');

            try {
                hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
                console.log("HitTestSource取得成功");
            } catch (err) {
                console.error("ヒットテストソース取得エラー:", err);
            }

            // WebXR inputのselectイベント（ユーザーが画面をタップすると発生）
            app.xr.input.on('select', function (inputSource) {
                console.log('select event detected');
                placeModelRequested = true;
            });
        });

        // ARセッション中の毎フレーム処理
        app.xr.on('update', function (xrFrame) {
            if (!hitTestSource || !xrFrame || !localReferenceSpace) return;

            const hitResults = xrFrame.getHitTestResults(hitTestSource);
            if (hitResults.length > 0) {
                const hitPose = hitResults[0].getPose(localReferenceSpace);
                if (hitPose) {
                    // ヒット結果がある場合レティクルを表示・位置更新
                    reticle.enabled = true;
                    reticle.setPosition(
                        hitPose.transform.position.x,
                        hitPose.transform.position.y,
                        hitPose.transform.position.z
                    );

                    if (placeModelRequested) {
                        entity.setPosition(
                            hitPose.transform.position.x,
                            hitPose.transform.position.y,
                            hitPose.transform.position.z
                        );
                        entity.setLocalScale(0.1, 0.1, 0.1);
                        entity.enabled = true;
                        console.log("モデル配置位置:", hitPose.transform.position);
                        placeModelRequested = false;
                        // 必要に応じてreticleを非表示
                        // reticle.enabled = false;
                    }
                }
            } else {
                // ヒットがない場合はレティクル非表示
                reticle.enabled = false;
            }
        });

        app.xr.on('end', function () {
            console.log("ARセッションが終了しました");
            placeModelRequested = false;
            reticle.enabled = false;
            hitTestSource = null;
            localReferenceSpace = null;
        });
    } else {
        console.warn("WebXR (AR) が利用できません");
    }
});

app.on('update', function (dt) {
    // 通常シーン更新処理
});
