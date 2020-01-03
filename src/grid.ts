import * as THREE from 'three';
import Cell from './cell';

export default class Grid
{
    treeObj : THREE.Object3D;
    size : number;
    cellSize : number;
    grid : Array<Array<Cell>>;

    //mouse interaction
    raycaster : THREE.Raycaster;
    INTERSECTED;

    constructor(size : number, cellSize : number)
    {
        this.size = size;
        this.cellSize = cellSize;
        this.treeObj = new THREE.Object3D();

        this.init();
        this.generateGrid();
    }

    init() : void
    {
        this.raycaster = new THREE.Raycaster();
    }

    generateGrid() : void
    {
        this.grid = new Array(this.size);

        for (var i = 0; i < this.grid.length; i++) { 
            this.grid[i] = new Array(this.size); 
        } 
          
        var geometry : THREE.PlaneGeometry = new THREE.PlaneGeometry(1, 1, 1);
        
        // Loop to initilize 2D array elements. 
        for (var i = 0; i < this.size; i++) { 
            for (var j = 0; j < this.size; j++) { 
                this.grid[i][j] = new Cell(i, j); 

                var material : THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });

                var plane = new THREE.Mesh(geometry, material);

                plane.translateX(i*this.cellSize);
                plane.translateZ(j*this.cellSize);
                plane.rotation.x = - Math.PI / 2;

                this.treeObj.add(plane);
            } 
        }
        
        this.treeObj.translateX(-this.size*this.cellSize/2);
        this.treeObj.translateZ(-this.size*this.cellSize/2);
    }

    mouseInteract(mouse , camera) : void 
    {
        this.raycaster.setFromCamera(mouse, camera);
        
        var intersects = this.raycaster.intersectObjects(this.treeObj.children);
        if (intersects.length > 0) {
            if (this.INTERSECTED != intersects[0].object) {
                if(this.INTERSECTED) this.INTERSECTED.material.color.set(0x000000);
                //if (INTERSECTED) INTERSECTED.material.color.set(INTERSECTED.currentColor);
                this.INTERSECTED = intersects[0].object;
                console.log(this.INTERSECTED);
                this.INTERSECTED.currentColor = this.INTERSECTED.material.color;
                this.INTERSECTED.material.color.set(0xff0000);
            }
        } else {
            if (this.INTERSECTED) this.INTERSECTED.material.color.set(0x000000);
            this.INTERSECTED = null;
        }
    }
}