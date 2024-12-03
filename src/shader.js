export function registerShaderScript(){
var Shader = pc.createScript('shader');

Shader.attributes.add('materials', {
    type: 'asset',
    assetType: 'material',
    array: true
});
Shader.attributes.add('chunks', {
    type: 'json',
    schema: [
        {
            name: 'name',
            title: 'Name',
            description: 'Name of the chunk to override.',
            type: 'string'
        }, 
        {
            name: 'type',
            title: 'Type',
            description: 'Specifies whether the chunk is a vertex or fragment chunk.',
            type: 'number',
            enum: [
                { 'Vertex': 0 },
                { 'Fragment': 1 }
            ],
            default: 1
        }, 
        {
            name: 'shaderChunk',
            title: 'Shader Chunk',
            description: 'Shader chunk asset.',
            type: 'asset',
            assetType: 'shader'
        }
    ],
    array: true
});
Shader.attributes.add('uniforms', {
    type: 'json',
    schema: [
        {
            name: 'name',
            title: 'Name',
            description: 'Name of the uniform.',
            type: 'string'
        }, 
        {
            name: 'value',
            title: 'Value',
            description: 'Value of the uniform.',
            type: 'vec4'
        }
    ],
    array: true
});        

Shader.prototype.initialize = function () {
    // update all the materials with the chunk
    this.materials.forEach(function (materialAsset) {
        var material = materialAsset.resource;
        this.chunks.forEach(function (chunk) {
            var ext = chunk.type === 0 ? 'VS' : 'PS';
            material.chunks[chunk.name + ext] = chunk.shaderChunk.resource;
            material.chunks.APIVersion = pc.CHUNKAPI_1_62;
            material.update();
        });
    }.bind(this));

    this.time = 0;
};

Shader.prototype.update = function (dt) {
    // update the time uniform in the new shader chunk
    this.time += dt;
    for (var i = 0; i < this.materials.length; i++) {
        var material = this.materials[i].resource;
        material.setParameter('iTime', this.time);
    }
}};
