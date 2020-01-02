import * as TREE from 'three';
import Cell from './cell';

export default class Grid
{
    treeObj : TREE.Object3D;
    size : number;
    cellSize : number;
    grid;

    constructor(size : number, cellSize : number)
    {
        this.size = size;
        this.cellSize = cellSize;
        this.treeObj = new TREE.Object3D();

        this.generateGrid();
    }

    generateGrid() : void
    {
        this.grid = new Array(this.size);

        for (var i = 0; i < this.grid.length; i++) { 
            this.grid[i] = new Array(this.size); 
        } 
          
        var geometry : TREE.PlaneGeometry = new TREE.PlaneGeometry(1, 1, 1);
        
        // Loop to initilize 2D array elements. 
        for (var i = 0; i < this.size; i++) { 
            for (var j = 0; j < this.size; j++) { 
                this.grid[i][j] = new Cell(i, j); 

                var material : TREE.MeshBasicMaterial = new TREE.MeshBasicMaterial({ color: 0xffff00, side: TREE.DoubleSide });

                var plane = new TREE.Mesh(geometry, material);

                plane.translateX(i*this.cellSize);
                plane.translateZ(j*this.cellSize);
                plane.rotation.x = - Math.PI / 2;

                this.treeObj.add(plane);
            } 
        }
        
        this.treeObj.translateX(-this.size*this.cellSize/2);
        this.treeObj.translateZ(-this.size*this.cellSize/2);
    }
}