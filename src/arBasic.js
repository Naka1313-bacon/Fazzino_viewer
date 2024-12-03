export function registerARScript() {
    pc.script.create('arBasic', function (app) {
        var ArBasic = function (entity) {
            this.entity = entity;
        };
    
        ArBasic.prototype = {
            initialize: function () {
                // WebXRが利用可能かチェック
                if (app.xr.isAvailable(pc.XRTYPE_AR)) {
                    // タッチイベントでARを有効化
                    app.touch.on('touchend', this.activate, this);
                } else {
                    console.warn("WebXR (AR) が利用できません");
                }
            },
    
            activate: function () {
                // WebXR ARモードを開始
                this.entity.camera.startXr(pc.XRTYPE_AR, pc.XRSPACE_LOCALFLOOR).then(() => {
                    console.log("ARモードが開始されました");
                }).catch((err) => {
                    console.error("ARモードの開始に失敗しました:", err);
                });
            }
        };
    
        return ArBasic;
    });}