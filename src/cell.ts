import { Mesh } from "three";

export default class Cell
{
    x : number;
    y : number;
    isObstacle: boolean;
    mesh : Mesh;

    constructor(x : number, y : number)
    {
        this.x = x;
        this.y = y;
    }
}