/* IMPORTS */
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {MapControls} from 'three/examples/jsm/controls/MapControls';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import "./style.scss";
import TWEEN from '@tweenjs/tween.js';
/* ARRAY OF OBJECTS */
const objects = [];

const renderer = new THREE.WebGLRenderer({ antialias: true, precision: 'highp'});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;// Enable shadows
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights = true; // Enable PBR
renderer.outputEncoding = THREE.sRGBEncoding;// Enable sRGB
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x004455 );

// Ambient light
const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.2);
scene.add( ambientLight );


// Function to create a directional light
const createDirectionalLight = (color,intensity,position,shadowMapSize = 2048, near = 0.5, far = 500) => {
  const directionalLight = new THREE.DirectionalLight(color, intensity);
  directionalLight.position.set(position.x, position.y, position.z);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = shadowMapSize;
  directionalLight.shadow.mapSize.height = shadowMapSize;
  directionalLight.shadow.camera.near = near;
  directionalLight.shadow.camera.far = far;
  return directionalLight;
};
// Directional lights
const directionalLight1 = createDirectionalLight(0xFFFFFF, 1, { x: 0, y: 10, z: 5 });
scene.add(directionalLight1);

const directionalLight2 = createDirectionalLight(0xFFFFFF, 1, { x: 0, y: 10, z: -5 });
scene.add(directionalLight2);

const camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
scene.add( camera );

const composer = new EffectComposer( renderer );
const renderPass = new RenderPass( scene, camera );
composer.addPass( renderPass );

const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
outlinePass.selectedObjects = [];
outlinePass.edgeStrength = 5;
outlinePass.edgeGlow = 0.5;
outlinePass.edgeThickness = 1;
outlinePass.visibleEdgeColor.set('#ffffff');
outlinePass.hiddenEdgeColor.set('#ffffff');

composer.addPass(outlinePass);

const fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
composer.addPass(fxaaPass);

const controls = new MapControls( camera, renderer.domElement );
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE
}
controls.rotateSpeed = -0.5; //  Reverses direction
controls.enableZoom = false;
controls.enablePan = false;

moveCamera( camera.position );
controls.update();

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  // Update FXAA pass with new resolution
  fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
}

window.addEventListener( 'resize', resize() );

const loader = new GLTFLoader();
let bounds;
let rooms;
loader.load(  'models/room/scene.gltf', function( gltf ) {
    const model = gltf.scene;
    scene.add( model );
    model.position.set( 0, 0, 0 );

    // Traverse the model to find the painting mesh
    model.traverse(function(node) {
      console.log("Node name:", node.name,"Type: ", node.type);
      if (node.type == "Mesh" && node.name === "Modern_Living_Room_Painting_0") {
          objects.push(node);
          console.log("Painting mesh added for interaction."); 
      }
      if (node.type == "Mesh" && node.name === "Modern_Living_Room_Sofa_0") {
        objects.push(node);
        console.log("Sofa mesh added for interaction.");
      }
      if (node.type == "Mesh" && node.name === "Modern_Living_Room_TVScreen_0") {
        objects.push(node);
        console.log("TV mesh added for interaction.");
      }     
      if (node.name === "Modern_Living_Room") {
        rooms = node;
      }
    });
    
    const box = new THREE.Box3().setFromObject( model );
    const size = new THREE.Vector3();    

    box.getSize(size);    
//set bounds for model
    bounds = {
      minX: -size.x / 2,
      maxX: size.x / 2,
      minY: -size.y / 2,
      maxY: size.y / 2,
      minZ: -size.z / 2,
      maxZ: size.z / 2 + 1.78
    };       

//floormesh settings
// const floorMeshMaterial = new THREE.MeshBasicMaterial({
//   color: 0x484742,
//   wireframe: false,
//   transparent: true,
//   opacity: 0 //0 to make it 100% invisible
// });

// // Create a floor mesh
// const floorMesh = new THREE.Mesh(
//   new THREE.PlaneGeometry( size.x*0.7,size.z*1.05), // Placeholder size /**make it a little bit smaller than model */
//   floorMeshMaterial
// );

// floorMesh.position.set(0, -0.01, 5); // Needs to be just below the floor of model
// floorMesh.rotateX( - Math.PI / 2 );
// scene.add( floorMesh );
// objects.push( floorMesh ); // Might not be needed? Will investigate

/** display model size in console (for fix floormesh size)
console.log("Model size: ", size);
**/
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let isAnimating = false;
function moveCamera( point ) {
  var direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  // Disable controls while animating
  controls.enabled = false; 
  //smooth camera movement
  new TWEEN.Tween(camera.position)
    .to({ x: point.x, y: point.y + 6, z: point.z - 0.01 }, 700)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onComplete(() => {
      controls.enabled = true;
      isAnimating = false;
    })
    .start();    
  camera.position.copy(point).add(new THREE.Vector3(0, 6, -0.01));
  controls.target.copy( camera.position ).add(direction);
}

// Store the position when the mouse is pressed down
let mouseDownPosition = new THREE.Vector2();

document.addEventListener('mousedown', function(event) {
  // Record the position where the mouse pressed down
  mouseDownPosition.set(
    (event.clientX / window.innerWidth) * 2 - 1,
    - (event.clientY / window.innerHeight) * 2 + 1
  );
});

function onMouseUp ( event ) {
  if (isAnimating || isModalOpen){
    return;
  }
    if (event.target.matches(".color1, .color2, .color3")) {
    return;
  }
  let mouseUpPosition = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    - (event.clientY / window.innerHeight) * 2 + 1
  );

  // Only move the camera if the mouse hasn't moved significantly
 if (mouseDownPosition.distanceTo(mouseUpPosition) < 0.01) {
    pointer.set(mouseUpPosition.x, mouseUpPosition.y);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      const intersect = intersects[0];
      // Check if the painting was clicked
      if (intersect.object.name === "Modern_Living_Room_Painting_0") {
        console.log("Painting clicked");
        openPaintingModal();
        const sofa = document.querySelector(".material-wrapper");
        sofa.style.display = "none";

        const sofaText = document.querySelector(".text");
        sofaText.style.display = "none";
      } else if (
        // move
        (intersect.object.name === "Modern_Living_Room_Planks_0" || intersect.object.name === "Modern_Living_Room_Carpet_0") &&
        intersect.point.x >= bounds.minX &&
        intersect.point.x <= bounds.maxX &&
        intersect.point.z >= bounds.minZ &&
        intersect.point.z <= bounds.maxZ
      ) {
        moveCamera(intersect.point);
        const sofa = document.querySelector(".material-wrapper");
        sofa.style.display = "none";

        const sofaText = document.querySelector(".text");
        sofaText.style.display = "none";
      } else if (intersect.object.name === "Modern_Living_Room_Sofa_0") {
        // Sofa
        setMaterial(intersect.object, "Sofa");
      } else if (intersect.object.name === "Modern_Living_Room_EndTable_0") {
        setMaterial(intersect.object, "Table");
      } else if (intersect.object.name === "Modern_Living_Room_CoffeeTable_0") {
        setMaterial(intersect.object, "CoffeeTable");
      } else {
        console.log(intersect.object.name);
        const sofa = document.querySelector(".material-wrapper");
        sofa.style.display = "none";

        const sofaText = document.querySelector(".text");
        sofaText.style.display = "none";
      }
    }
    controls.update();
  }
}


function setMaterial(object, text) {
  const sofa = document.querySelector(".material-wrapper");
  sofa.style.display = "flex";

  const sofaText = document.querySelector(".text");
  sofaText.style.display = "block";
  sofaText.innerHTML = text;

  const color1 = document.querySelector(".color1");
  color1.onpointerup = function (event) {
    object.material = new THREE.MeshMatcapMaterial({ color: 0xff0000 });
    sofa.style.display = "none";
    sofaText.style.display = "none";
  };

  const color2 = document.querySelector(".color2");
  color2.onpointerup = function (event) {
    object.material = new THREE.MeshMatcapMaterial({ color: 0x00ff00 });
    sofa.style.display = "none";
    sofaText.style.display = "none";
  };

  const color3 = document.querySelector(".color3");
  color3.onpointerup = function (event) {
    object.material = new THREE.MeshMatcapMaterial({ color: 0x0000ff });
    sofa.style.display = "none";
    sofaText.style.display = "none";
  };
}


// Check if the paintingInfo modal is open
let isModalOpen = false;
// Painting Info popup and close control
function openPaintingModal() {
  const modal = document.getElementById("paintingInfo");
  modal.style.display = "block";
  isModalOpen = true;
  modal.addEventListener("click", function(event) {
    event.stopPropagation();
  });

  document.querySelector(".close-button").onclick = function(event) {
    event.stopPropagation();
    modal.style.display = "none";
    isModalOpen = false;
  };

  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
      isModalOpen = false;
    }
  };
}

function onMouseMove(event) {
  pointer.set(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(objects, true);

  if (intersects.length > 0) {
    const intersect = intersects[0].object;
    if (intersect !== selectedObject) {
      selectedObject = intersect;
      outlinePass.selectedObjects = [selectedObject];
    }
  } else {
    selectedObject = null;
    outlinePass.selectedObjects = [];
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const resetButton = document.getElementById('resetButton');
  resetButton.addEventListener('click', () => {
    location.reload();
  });
  document.getElementById('menu').addEventListener('mousedown', (event) => {
    event.stopPropagation();
  });
  document.getElementById('menu').addEventListener('mouseup', (event) => {
    event.stopPropagation();
  });
  document.getElementById('menu').addEventListener('click', (event) => {
    event.stopPropagation();
  });
});

let selectedObject = null;
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('mouseup', onMouseUp);

function animate() {
  TWEEN.update();  
  composer.render();
}
renderer.setAnimationLoop( animate );