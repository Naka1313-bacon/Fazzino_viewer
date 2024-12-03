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
// Fill the available space at full resolution
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
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

// Resize the canvas when the window is resized
window.addEventListener('resize', () => app.resizeCanvas());
app.start();



var light = new pc.Entity('light');
light.addComponent('light');
light.setLocalEulerAngles(90, 0, 0);
app.root.addChild(light);



var entity = new pc.Entity();
app.root.addChild(entity);
entity.addComponent('gsplat', {
    // GSplat-related properties
});

var camera = new pc.Entity('camera');
camera.addComponent('camera', {
    clearColor: new pc.Color(1, 1, 1)
});

camera.addComponent('script');
camera.script.create('orbitCamera', {
    attributes: {
        distanceMin: 6
    }
});
camera.script.create('orbitCameraInputMouse');
camera.script.create('orbitCameraInputTouch');
camera.script.create('arBasic');

app.root.addChild(camera);

app.assets.loadFromUrl(modelUrl, 'gsplat', function (err, asset) {
    if (err) {
        console.error('Failed to load model:', err);
        return;
    }
    entity.gsplat.asset = asset;



});


// document.getElementById('skyboxSelector').addEventListener('change', function(event) {
//     changeSkybox(event.target.value);
// });

// changeSkybox('white');
document.getElementById('start-ar').addEventListener('click', function () {
    if (app.xr.isAvailable(pc.XRTYPE_AR)) {
        camera.camera.startXr(pc.XRTYPE_AR, pc.XRSPACE_LOCALFLOOR).then(() => {
            console.log("ARモードが開始されました");
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
