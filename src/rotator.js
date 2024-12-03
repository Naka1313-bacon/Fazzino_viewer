export function registerRotatorScript() {
    var Rotator = pc.createScript('rotator');

    Rotator.attributes.add('speed', { type: 'number', default: 2, description: 'Speed of rotation' });
    Rotator.attributes.add('pitchSpeed', { type: 'number', default: 0.25 });
    Rotator.attributes.add('pitchAmount', { type: 'number', default: 1 });
    Rotator.attributes.add('startDelay', { type: 'number', default: 1, description: 'Delay time before starting the animation in seconds ' });
    Rotator.attributes.add('startFadeInTime', { type: 'number', default: 0, description: 'How long to fade in the animation in seconds' });

    const smoothStep = (x) => (x <= 0) ? 0 : (x >= 1) ? 1 : Math.sin((x - 0.5) * Math.PI) * 0.5 + 0.5;

    // initialize code called once per entity
    Rotator.prototype.initialize = function() {
        this.pitch = 0;
        this.yaw = 0;
        this.timer = 0;
    };

    // update code called every frame
    Rotator.prototype.update = function(dt) {
        const camera = this.entity.script.orbitCamera;
        if (!camera) {
            return;
        }
        // console.log('pitch',this.pitch);
        // console.log('camerapitch',camera.pitch);
        // console.log('yaw',this.yaw);
        // console.log('camerayaw',camera.yaw);
        if (this.pitch !== camera.pitch || this.yaw !== camera.yaw) {
          
            this.pitch = camera.pitch;
            this.yaw = camera.yaw;
            this.timer = 0;
        } else {
            this.timer += dt;
        }

        if (this.timer > this.startDelay) {
            // animate still camera
            const time = this.timer - this.startDelay;
            const fadeIn = smoothStep(time / this.startFadeInTime);

            this.yaw += dt * fadeIn * this.speed;
            // this.pitch += Math.sin(time * this.pitchSpeed) * dt * fadeIn * this.pitchAmount;
            camera.yaw = this.yaw;
            camera.pitch = this.pitch;
        }
        
    };
}