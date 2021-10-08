using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class PerlinGen : MonoBehaviour {

    [SerializeField]
    private Vector2 perlinPos;
    private float perlinNoise = 0.0f;

    public float zOffset = -10.0f;
    public float refinement = 0.1f;
    public float multiplier = 10.0f;
    public int axisSize = 50;

	// Use this for initialization
	void Start () {
		for(int i = 0; i < axisSize; i++)
        {
            for( int j = 0; j < axisSize; j++)
            {
                perlinNoise = Mathf.PerlinNoise(i * refinement, j * refinement);
                GameObject cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
                cube.transform.position = new Vector3(i, (perlinNoise * multiplier) + zOffset, j);
            }
        }
	}
	
	// Update is called once per frame
	void Update () {

	}
}
