import * as THREE from 'three';
import Cell from './cell';
import { Vector2, Material, MeshBasicMaterial } from 'three';
import Pathfinder from './pathfinder';

export default class Grid
{
    treeObj : THREE.Object3D;
    size : number;
    cellSize : number;
    planeOffset : number;
    grid : Array<Array<Cell>>;
    pathfinder : Pathfinder;

    //mouse interaction
    raycaster : THREE.Raycaster;
    INTERSECTED;

    constructor(size : number, cellSize : number)
    {
        this.size = size;
        this.cellSize = cellSize;
        this.treeObj = new THREE.Object3D();
        this.pathfinder = new Pathfinder();

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
                var newCell = new Cell(i, j); 

                var material : THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
                var planeMesh = new THREE.Mesh(geometry, material);

                planeMesh.translateX(i*this.cellSize);
                planeMesh.translateZ(j*this.cellSize);
                planeMesh.rotation.x = - Math.PI / 2;

                this.treeObj.add(planeMesh);

                newCell.mesh = planeMesh;
                this.grid[i][j] = newCell;
            } 
        }
        
        this.planeOffset = this.size*this.cellSize/2;

        this.treeObj.translateX(-this.planeOffset);
        this.treeObj.translateZ(-this.planeOffset);
    }

    toGridCoords(worldCoords : Vector2) : Vector2
    {
        return new Vector2(
            Math.round(worldCoords.x / this.cellSize + this.planeOffset), 
            Math.round(worldCoords.y / this.cellSize + this.planeOffset)
            );
    }

    isValid(x : number, y : number) : boolean
    {
        return this.inGrid(x, y) && !this.grid[x][y].isObstacle;
    }

    inGrid(x : number, y : number) : boolean
    {
        return x >= 0 && x < this.size && y > 0 && y < this.size;
    }

    getNeighbors(cell : Cell) : Array<Cell>
    {
        var neighbors : Array<Cell> = new Array<Cell>();

        for(var i = -1; i <=1 ; i++)
        {
            for(var j = -1; j <=1 ; j++)
            {
                if(i == 0 && j == 0)
                {
                    continue;
                }

                var x = cell.x + i;
                var y = cell.y + j;

                if(this.isValid(x, y))
                {
                    var gridCell = this.grid[x][y];
                    neighbors.push(gridCell);
                }
            }       
        }

        return neighbors;
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
                //console.log(this.INTERSECTED);
                this.INTERSECTED.currentColor = this.INTERSECTED.material.color;
                this.INTERSECTED.material.color.set(0xff0000);
            }
        } else {
            if (this.INTERSECTED) this.INTERSECTED.material.color.set(0x000000);
            this.INTERSECTED = null;
        }
    }

    onMouseDown(mouse, camera) : void 
    {
        this.raycaster.setFromCamera(mouse, camera);

        var intersects = this.raycaster.intersectObjects(this.treeObj.children);
        if (intersects.length > 0) 
        {
            var vec2 : Vector2 = new Vector2(intersects[0].point.x, intersects[0].point.z);
            vec2 = this.toGridCoords(vec2);
            console.log(vec2);

            if(this.firstClick)
            {
                this.cell1 = this.grid[vec2.x][vec2.y];
                this.firstClick = false;       
            }
            else
            {
                this.cell2 = this.grid[vec2.x][vec2.y];

                var path = this.pathfinder.aStar(this.cell1, this.cell2, this);
                path.forEach(cell => {
                    var material : MeshBasicMaterial = <MeshBasicMaterial>cell.mesh.material;
                    material.color.set(0x03FC20); 
                });

                this.firstClick = true;
            }
        }
    }

    getCell(x : number, y : number) : Cell
    {
        if(this.inGrid(x, y))
        {
            return this.grid[x][y];
        }
        return null;
    }

    cell1;
    cell2;
    firstClick = true;
}