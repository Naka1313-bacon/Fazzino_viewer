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

// 初期はモデルを非表示にしておく
entity.enabled = false;

// AR用変数
let hitTestSource = null;
let localReferenceSpace = null;
let placeModelRequested = false; // タッチでモデルを配置したいことを示すフラグ

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
// レティクルを少し小さく
reticle.setLocalScale(0.2, 0.2, 0.2);
app.root.addChild(reticle);

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

document.getElementById('start-ar').addEventListener('click', function () {
    if (app.xr.isAvailable(pc.XRTYPE_AR)) {
        camera.camera.startXr(pc.XRTYPE_AR, pc.XRSPACE_LOCALFLOOR, {
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: document.body }
        });

        app.xr.on('start', async function () {
            console.log("ARセッションが開始されました");
            const session = app.xr.session;

            const viewerSpace = await session.requestReferenceSpace('viewer');
            localReferenceSpace = await session.requestReferenceSpace('local-floor');

            // ヒットテストソースを取得
            try {
                hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
            } catch (err) {
                console.error("ヒットテストソース取得エラー:", err);
            }

            // タッチイベントをdocumentで取得
            document.addEventListener('touchstart', function (event) {
                console.log('タッチ開始:', event.touches[0].clientX, event.touches[0].clientY);
                // タッチ時にフラグ立て
                placeModelRequested = true;
            }, { passive: true });
        });

        // ARセッション中の毎フレーム処理
        app.xr.on('update', function (xrFrame) {
            if (!hitTestSource || !xrFrame) return;

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

                    // タッチでモデル配置要求が出ていたらレティクル位置にモデル配置
                    if (placeModelRequested) {
                        entity.setPosition(
                            hitPose.transform.position.x,
                            hitPose.transform.position.y,
                            hitPose.transform.position.z
                        );
                        entity.enabled = true; // モデル表示
                        console.log("モデル配置位置:", hitPose.transform.position);
                        placeModelRequested = false;
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
