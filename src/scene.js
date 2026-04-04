import * as THREE from 'three';
export const scene = new THREE.Scene();

// Default lighting for 3D models
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
export const directional = new THREE.DirectionalLight(0xffffff, 0.8);
directional.position.set(5, 10, 7);
scene.add(directional);
