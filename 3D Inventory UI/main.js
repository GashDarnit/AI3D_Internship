import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');

uploadBtn.addEventListener('click', () => {
    fileInput.click();
});

// Event listener for file selection
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        loadModel(file);
    }
});

// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 50);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.addEventListener('wheel', (event) => {
    event.preventDefault();
});

document.body.appendChild(renderer.domElement);

// Add lighting
const light = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(light);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false; // Disable panning completely
controls.enableZoom = true;
controls.enableRotate = true;
controls.minDistance = 20; // Closest zoom
controls.maxDistance = 90; // Farthest zoom
controls.zoomSpeed = 0.5;

// Constrain rotation to Y-axis
controls.addEventListener('change', () => {
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(camera.position);

    // Constrain to the Y-axis
    spherical.phi = Math.PI / 2; // Fix elevation (up-down tilt)
    camera.position.setFromSpherical(spherical);
    camera.lookAt(new THREE.Vector3(0, 0, 0)); // Look at the origin
});

var model;

// Generalized load function
function loadModel(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    
    if (model) {
        scene.remove(model);
        model = null; // Reset the model reference
    }
    
    let loader;
    const reader = new FileReader();

    reader.onload = function(event) {
        const content = event.target.result;

        switch (extension) {
            case 'gltf':
            case 'glb':
                loader = new GLTFLoader();
                break;
            case 'obj':
                loader = new OBJLoader();
                break;
            case 'fbx':
                loader = new FBXLoader();
                break;
            default:
                console.error(`Unsupported file format: ${extension}`);
                return;
        }

        // Create a Blob URL from the ArrayBuffer
        const blob = new Blob([content], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);

        loader.load(
            url,
            (object) => {
                model = object.scene || object; // Handle object structure differences
                if(extension === 'fbx') model.scale.set(0.2, 0.2, 0.2);
                scene.add(model);
            },
            (xhr) => {},
            (error) => {
                console.error(`An error occurred while loading ${file.name}:`, error);
            }
        );
    };

    reader.readAsArrayBuffer(file);
}

let lastPosition = new THREE.Vector3();
let isMouseDown = false;
let isRotating = true;
const movementThreshold = 0.05;

// Track mouse down and mouse up events
renderer.domElement.addEventListener('mousedown', () => {
    isMouseDown = true;
    isRotating = false;
    controls.enableDamping = false;
});

renderer.domElement.addEventListener('mouseup', () => {
    isMouseDown = false;
    isRotating = true;
    controls.enableDamping = true;
});

function animate() {
    requestAnimationFrame(animate);

    // If the mouse is held down, stop the rotation, regardless of movement
    if (isMouseDown) {
        isRotating = false;
    } else {
        // If the camera hasn't moved significantly, resume rotation
        const cameraMoved = camera.position.distanceTo(lastPosition) > movementThreshold;
        if (!cameraMoved) {
            isRotating = true;
        }
    }

    lastPosition.copy(camera.position);

    // Only rotate the model if it's allowed
    if (isRotating && model) {
        model.rotation.y += 0.0025;
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();


// Adjust renderer on window resize
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});
