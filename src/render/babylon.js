// Deep imports keep the bundle to the parts of Babylon.js this game uses.
// The package root ('@babylonjs/core') pulls in nearly the whole engine.
export { Engine } from '@babylonjs/core/Engines/engine.js';
export { Constants } from '@babylonjs/core/Engines/constants.js';
export { Scene } from '@babylonjs/core/scene.js';
export { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
export { Vector3, Quaternion, Matrix } from '@babylonjs/core/Maths/math.vector.js';
export { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
export { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder.js';
export { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder.js';
export { CreateLineSystem } from '@babylonjs/core/Meshes/Builders/linesBuilder.js';
export { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder.js';
export { CreateRibbon } from '@babylonjs/core/Meshes/Builders/ribbonBuilder.js';
export { Mesh } from '@babylonjs/core/Meshes/mesh.js';
export { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
export { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
export { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
export { Effect } from '@babylonjs/core/Materials/effect.js';
export { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
export { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
export { PointsCloudSystem } from '@babylonjs/core/Particles/pointsCloudSystem.js';
export { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
export { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
export { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent.js';
export { CreateIcoSphere } from '@babylonjs/core/Meshes/Builders/icoSphereBuilder.js';
export { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder.js';
export { CreatePolyhedron } from '@babylonjs/core/Meshes/Builders/polyhedronBuilder.js';
export { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
