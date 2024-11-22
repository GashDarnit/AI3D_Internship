import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';


const modelTextureMapping = {
    obj: ['mtl'],         // OBJ models use MTL for textures
    gltf: ['jpg', 'jpeg', 'png'], // GLTF supports image textures
    glb: ['jpg', 'jpeg', 'png'],  // GLB is binary GLTF
    fbx: ['jpg', 'jpeg', 'png']   // FBX supports image textures
};

const modelCache = new Map(); // Cache to store loaded models
const inventoryItemsContainer = document.getElementById('inventory'); // Where inventory items will be displayed

const uploadButton = document.getElementById('uploadButton');
const fileInput = document.getElementById('fileInput');
const textureUploadButton = document.getElementById('textureUploadButton');
const textureInput = document.getElementById('textureInput');



var model;
var loader;
var modelURL;
var textureURL;
let lastPosition = new THREE.Vector3();
let isMouseDown = false;
let isRotating = true;
const movementThreshold = 0.05;

const slotsPerPage = 12; // Maximum number of slots per page
let currentPage = 1;
const pages = [[]];



// Get the canvas element inside the viewer
const canvas = document.getElementById('modelCanvas');
const width = canvas.clientWidth;
const height = canvas.clientHeight;

// Create the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setSize(width, height);

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



// Position the camera
camera.position.z = 50;

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

// Handle window resizing
window.addEventListener('resize', () => {
    const newWidth = canvas.clientWidth;
    const newHeight = canvas.clientHeight;
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
});


textureInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Add model to inventory
    createInventoryItem(file);
});

// Add event listener to upload models into the inventory
uploadButton.addEventListener('click', () => {
    fileInput.click();
});

// Handle file input for model upload
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        createInventoryItem(file); // Add model to inventory UI
        loadModel(file); // Load model for the viewer
    }
});

document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        updateInventoryUI();
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    if (currentPage < pages.length) {
        addNewPage(); // Add a new page dynamically
        currentPage++;
        updateInventoryUI();
    }
    
});



function loadModel(file) {
    const fileName = file.name;
    const extension = fileName.split('.').pop().toLowerCase();

    const reader = new FileReader();
    reader.onload = function (event) {
        const content = event.target.result;
        let loader;

        switch (extension) {
            case 'obj':
                loader = new OBJLoader();
                break;
            case 'gltf':
            case 'glb':
                loader = new GLTFLoader();
                break;
            case 'fbx':
                loader = new FBXLoader();
                break;
            default:
                console.error(`Unsupported file format: ${extension}`);
                return;
        }

        // Load the model and cache it
        const blob = new Blob([content], { type: 'application/octet-stream' });
        const modelURL = URL.createObjectURL(blob);

        loader.load(
            modelURL,
            (object) => {
                const loadedModel = object.scene || object; // Handle object structure differences
                loadedModel.userData.modelExtension = extension; // Store extension info
                if (extension === 'fbx') loadedModel.scale.set(0.2, 0.2, 0.2);

                modelCache.set(fileName, loadedModel); // Cache the loaded model
                displayModel(loadedModel.clone()); // Display the model
            },
            undefined,
            (error) => {
                console.error(`Error loading ${fileName}:`, error);
            }
        );
    };

    reader.readAsArrayBuffer(file);
}

function displayModel(loadedModel) {
    if (model) {
        scene.remove(model); // Remove the current model from the scene
    }
    model = loadedModel;
    scene.add(model); // Add the new model to the scene
}

function isTextureValidForModel(modelExtension, textureExtension) {
    const validExtensions = modelTextureMapping[modelExtension];
    return validExtensions && validExtensions.includes(textureExtension);
}


function createInventoryItem(file) {
    const fileName = file.name;

    // Find the first empty slot on the current page
    let currentSlots = pages[currentPage - 1];
    let emptySlot = currentSlots.find((slot) => !slot.filled);

    if (!emptySlot) {
        console.log('No empty slots on the current page!');
        addNewPage();
        
        currentPage++;
        currentSlots = pages[currentPage - 1];
        emptySlot = currentSlots.find((slot) => !slot.filled);
    }

    // Mark the slot as filled
    emptySlot.filled = true;

    // Refresh the UI
    updateInventoryUI();
}

function updateInventoryUI() {
    const inventoryItems = document.getElementById('inventoryItems');
    inventoryItems.innerHTML = ''; // Clear current slots

    // Render the slots for the current page
    pages[currentPage - 1].forEach((slot, index) => {
        const slotDiv = document.createElement('div');
        slotDiv.classList.add('inventory-slot');
        if (slot.filled) {
            slotDiv.classList.add('filled');
            slotDiv.style.backgroundImage = "url('static/icons/logo_tight.png')";
        }
        inventoryItems.appendChild(slotDiv);
    });

    // Update pagination controls
    document.getElementById('pageIndicator').textContent = `Page ${currentPage}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === pages.length;
}

function addNewPage() {
    pages.push([]);
    for (let i = 0; i < slotsPerPage; i++) {
        pages[pages.length - 1].push({ filled: false });
    }

    console.log("New Page: " + pages);
}

// Initialize the first page with empty slots
for (let i = 0; i < slotsPerPage; i++) {
    pages[0].push({ filled: false });
}
console.log(pages);