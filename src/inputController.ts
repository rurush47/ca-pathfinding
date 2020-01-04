import Grid from "./grid";
import { Vector2, MeshBasicMaterial, Raycaster } from "three";
import Pathfinder from "./pathfinder";

export default class InputController
{
    constructor(grid : Grid)
    {
        this.grid = grid;
        this.raycaster = new Raycaster();
        this.pathfinder = new Pathfinder();
    }

    //mouse interaction
    pathfinder : Pathfinder;
    grid : Grid;
    raycaster : THREE.Raycaster;
    INTERSECTED;    

    mouseInteract(mouse , camera) : void 
    {
        this.raycaster.setFromCamera(mouse, camera);
        
        var intersects = this.raycaster.intersectObjects(this.grid.treeObj.children);
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


    cell1;
    cell2;
    firstClick = true;

    onMouseDown(mouse, camera) : void 
    {
        this.raycaster.setFromCamera(mouse, camera);

        var intersects = this.raycaster.intersectObjects(this.grid.treeObj.children);
        if (intersects.length > 0) 
        {
            var vec2 : Vector2 = new Vector2(intersects[0].point.x, intersects[0].point.z);
            vec2 = this.grid.toGridCoords(vec2);
            console.log(vec2);

            if(this.firstClick)
            {
                this.cell1 = this.grid.cellGrid[vec2.x][vec2.y];
                this.firstClick = false;       
            }
            else
            {
                this.cell2 = this.grid.cellGrid[vec2.x][vec2.y];

                var path = this.pathfinder.aStar(this.cell1, this.cell2, this.grid);
                path.forEach(cell => {
                    var material : MeshBasicMaterial = <MeshBasicMaterial>cell.mesh.material;
                    material.color.set(0x03FC20); 
                });

                this.firstClick = true;
            }
        }
    }
}