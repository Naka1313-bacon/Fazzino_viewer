import { registerRotatorScript } from './rotator.js';
import { registerOrbitCameraScript, registerOrbitCameraInputMouseScript, registerOrbitCameraInputTouchScript } from './orbit-camera.js';
// アプリケーションの作成
function initModelDetail() {const canvas = document.getElementById("modelContainer");
    const app = new pc.Application(canvas,{mouse: new pc.Mouse(canvas)});
    // Fill the available space at full resolution
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    
    // Resize the canvas when the window is resized
    window.addEventListener('resize', () => app.resizeCanvas());
    console.log(app)
    app.start();
    
    // シーンの背景色を白に設定
    
    
    // ライティングの設定
    var light = new pc.Entity('light');
    light.addComponent('light');
    light.setLocalEulerAngles(90, 0, 0);
    app.root.addChild(light);
    
    
    registerRotatorScript(app);
    registerOrbitCameraScript(app);
    registerOrbitCameraInputMouseScript(app);
    registerOrbitCameraInputTouchScript(app);
    
    var entity = new pc.Entity();
    app.root.addChild(entity);
    entity.addComponent('gsplat', {
        // GSplatに関連するプロパティを設定
    });
    
    
    app.assets.loadFromUrl(modelUrl, 'gsplat', function (err, asset) {
    
                    
        if (err) {
            console.error('Failed to load model:', err);
            return;
        }
        entity.gsplat.asset = asset;
        var camera = new pc.Entity('camera');
        camera.addComponent('camera', {
            clearColor: new pc.Color(1, 1, 1) // 背景色を白に設定
        });
        
        app.root.addChild(camera);

        camera.setPosition(0,0,7)
        const skyboxHeight = -3.0; // スカイボックスの底面の高さ
        entity.setLocalPosition(0, skyboxHeight, 0); // Y座標を設定
        entity.setLocalScale(1, 1, 1); // 適切なスケールを設定
        camera.addComponent('script');
        camera.script.create('orbitCamera',{
            attributes: {
               focusEntity:entity,
               distanceMin:5
    }});
        camera.script.create('orbitCameraInputMouse');
        camera.script.create('orbitCameraInputTouch');
        camera.script.create('rotator', {
            speed: 8,
            pitchSpeed: 0.25,
            pitchAmount: 1,
            startDelay: 2,
            startFadeInTime: 5
        });
    });
    
    // カメラエンティティの作成

    var LoadCubemap = pc.createScript('loadCubemap');
    LoadCubemap.prototype.initialize = function () {
        const cubemap = new pc.Asset('Cubemap', 'cubemap', {
            url: newmap
        }, {
            magFilter: pc.FILTER_LINEAR,
            minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR,
            anisotropy: 1,
            type: pc.TEXTURETYPE_RGBM,
            textures: skyboxUrls
        });
        cubemap.loadFaces = true;
        cubemap.on('load', () => {
            this.app.scene.setSkybox(cubemap.resources);
        });
        this.app.assets.add(cubemap);
        this.app.assets.load(cubemap);
    };
    
    var loadCubemap = new pc.Entity('loadCubemap');
    loadCubemap.addComponent('script');
    loadCubemap.script.create('loadCubemap', {
        attributes: {
            skyboxUrls: skyboxUrls
        }
    });
    app.root.addChild(loadCubemap);
    
    
    app.on('update', function (dt) {
        // シーンの更新やアニメーションなど
    }); }

    window.addEventListener('DOMContentLoaded', initModelDetail);