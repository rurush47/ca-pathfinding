import { Mesh, Vector3 } from "three";

export default class Cell
{
    x : number;
    y : number;
    isObstacle: boolean;
    mesh : Mesh;
    worldCoords : Vector3;

    constructor(x : number, y : number)
    {
        this.x = x;
        this.y = y;
    }

    getWorldCoords() : Vector3
    {
        return new Vector3(this.mesh.position.x, this.mesh.position.y, -this.mesh.position.z);
    }
}