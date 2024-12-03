// carousel.js

export function registerCarouselScript() {
    var Carousel = pc.createScript('carousel');

    Carousel.attributes.add('camera', { type: 'entity' });

    Carousel.prototype.initialize = function() {
        this.currentEntity = null;
        this.prevEntity = null;
        this.timer = 0;
        this.mode = 0.0;
   
    };
 
    Carousel.prototype.adjustCameraToFitObject = function(entity, camera) {
  
        const boundingBox = entity.gsplat.instance.mesh.aabb;
        const size = boundingBox.halfExtents.clone().scale(2);
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.camera.fov * Math.PI / 180;
        const distance = maxDim / (2 * Math.tan(fov / 2));
       return distance
    };

    Carousel.prototype.loadModel = function(modelUrl, vertexShaderResource, fragmentShaderResource) {
        var self = this;

        var thing = new pc.Asset('gsplat', 'gsplat', { url: modelUrl });
        thing.data.decompress = true;
        self.app.assets.add(thing);
        self.app.assets.load(thing);

        thing.ready((asset) => {
            var entity = new pc.Entity('gsplat');
            entity.addComponent('gsplat', { asset: asset });
            entity.gsplat.materialOptions = {
                vertex: vertexShaderResource.resource,
                fragment: fragmentShaderResource.resource
            };

            
            
           
            this.camera.addComponent('script');
            this.camera.script.create('orbitCamera',{
                attributes: { 
                    distanceMin:4.0,
                    
                    
        }});
            this.camera.script.create('orbitCameraInputMouse');
            this.camera.script.create('orbitCameraInputTouch');
            this.camera.script.create('rotator', {
                speed: 22,
                pitchSpeed: 0.2,
            });
            
            
           
            self.app.root.addChild(entity);

            if (self.prevEntity) {
                self.prevEntity.enabled = false;
            }

            self.prevEntity = self.currentEntity;
            self.currentEntity = entity;

            if (self.prevEntity) {
                self.prevEntity.enabled = true;
            }

            self.timer = 0.0;
        });
    };

    Carousel.prototype.update = function(dt) {
        const vp = new pc.Mat4();
        const wvpInv = new pc.Mat4();
        vp.mul2(this.camera.camera.projectionMatrix, this.camera.camera.viewMatrix);

        if (this.currentEntity) {
            const material = this.currentEntity.gsplat.instance.material;
            if (material) {
                material.setParameter('time', Math.max(0.0, this.timer * 0.75 - 0.5));
                material.setParameter('mode', 0);

                wvpInv.mul2(vp, this.currentEntity.getWorldTransform()).invert();
                material.setParameter('wvpInv', wvpInv.data);
            }
        }

        if (this.prevEntity) {
            const material = this.prevEntity.gsplat.instance.material;
            if (material) {
                material.setParameter('time', Math.min(1.0, this.timer * 0.5));
                material.setParameter('mode', 1);

                wvpInv.mul2(vp, this.prevEntity.getWorldTransform()).invert();
                material.setParameter('wvpInv', wvpInv.data);

                if (this.timer > 1.0) {
                    this.prevEntity.enabled = false;
                }
            }
        }

        this.timer += dt;
    };
}
