using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class Animal : MonoBehaviour {

    public float mass = 5.0f;
    // int health = 10;

    public float maxSpeed = 3.0f;
    public float maxForce = 0.2f;
    public bool isDebug = true;
    public int predictDistance = 10;
    public float detectionRadius = 50;
    public float arrivingDistance = 20.0f;
    public float desiredSeparation;
    public Transform capsuleT;
    public float seperationRatio = 1.0f;  //  TODO : sert a koi??
    private Linker debugLink = null;



    [SerializeField]
    Vector3 position;
    [SerializeField]
    Vector3 velocity;
    [SerializeField]
    Vector3 acceleration;
    float angle = 0;


    // Debug tools
    GameObject targetIcon;



    private Transform objPos;

    void Start() {
        position = transform.position;  // Random.Range(0,areaWidth-1), 0,  Random.Range(0, areaLength-1));
        velocity = new Vector3();
        acceleration = new Vector3();
        if (isDebug)
        {
            debugLink = gameObject.AddComponent<Linker>();
            debugLink.lineColor = Color.blue;
        }

        desiredSeparation = capsuleT.localScale.x;  // Object radius  x2

    }

    void Update() {

        velocity = velocity + acceleration;
        velocity = Vector3.ClampMagnitude(velocity, maxSpeed);
        position = position + velocity;
        gameObject.transform.position = position;
        angle = Mathf.Atan2(velocity.z, velocity.x);  // points toward movement
        gameObject.transform.eulerAngles = new Vector3(0, Mathf.Rad2Deg * -angle, 0);
        

        acceleration = acceleration * 0;  // reset accumulated accel between frames
    }


    public void ApplyForce(Vector3 force)
    {
        // Newton’s second law(with force accumulation and mass)
        force /= mass;
        acceleration += force;
    }


    public void randomStep()
    {
        int choice = Random.Range(0, 3);

        if (choice == 0)
        {
            acceleration.x = maxSpeed / 100;
        }
        else if (choice == 1)
        {
            acceleration.x = -maxSpeed / 100;
        }
        else if (choice == 2)
        {
            acceleration.z = maxSpeed / 100;
        }
        else
        {
            acceleration.z = -maxSpeed / 100;
        }

        /*location.x = Mathf.Clamp(location.x, 0, areaWidth - 1);
        location.z = Mathf.Clamp(location.z, 0, areaLength - 1);*/
    }

    public Vector3 Seek(Vector3 target)
    {
        Vector3 desired = target - position;
        desired.Normalize();
        desired *= maxSpeed;
        Vector3 steer = desired - velocity;
        steer = Vector3.ClampMagnitude(steer, maxForce);
        return steer;
    }
    public Vector3 Arrive(Vector3 target)
    {
        Vector3 desired = target - position;

        //The distance is the magnitude of the vector pointing from location to target.
        float d = desired.magnitude;
        desired.Normalize();
        //If we are closer than 100 pixels...
        if (d < arrivingDistance)
        {
            //...set the magnitude according to how close we are.
            double m = ToolsLib.Map(d, 0, arrivingDistance, 0, maxSpeed);
            desired *= (float)m;
        }
        else
        {
            // Otherwise, proceed at maximum speed.
            desired *= maxSpeed;
        }

        //The usual steering = desired - velocity
        Vector3 steer = desired - velocity;
        steer = Vector3.ClampMagnitude(steer, maxForce);
        return steer;
    }
    public Vector3 Flee(Vector3 target)
    {
        Vector3 desired = position - target;
        desired.Normalize();
        desired *= maxSpeed;
        Vector3 steer = desired - velocity;
        steer = Vector3.ClampMagnitude(steer, maxForce);
        return steer;
    }
    public Vector3 Align(List<GameObject> animals)
    {
        Vector3 sum = new Vector3();
        int count = 0;

        foreach (GameObject obj in animals)
        {
            Animal other = obj.GetComponent<Animal>();
            float dist = Vector3.Distance(position, other.position);
            if (dist > 0 && dist < detectionRadius)
            {
                sum = sum + other.velocity;
                count++;
            }
        }

        if (count > 0)
        {
            sum = sum / count;
            sum.Normalize();
            sum = sum * maxSpeed;
            Vector3 steer = sum - velocity;
            steer = Vector3.ClampMagnitude(steer, maxForce);
            //ApplyForce(steer);
            return steer;
        }
        else return new Vector3();
    }
    public Vector3 Separate(List<GameObject> animals)
    {
        Vector3 steer = new Vector3();
        Vector3 sum = new Vector3();
        int count = 0;

        foreach (GameObject obj in animals)
        {
            Animal other = obj.GetComponent<Animal>();
            float dist = Vector3.Distance(position, other.position);
            if (dist > 0 && dist < (desiredSeparation * seperationRatio))
            {
                Vector3 diff = position - other.position;
                diff.Normalize();
                diff /= dist;  // Weight by distance
                sum += diff;
                count++;
            }


            if (count > 0)
            {
                sum /= count;
                sum.Normalize();
                sum *= maxSpeed;
                steer = sum - velocity;
                steer = Vector3.ClampMagnitude(steer, maxForce);
                //ApplyForce(steer);
            }

        }
        return steer;
    }
    // Cohesion
    // For the average position (i.e. center) of all nearby animals, calculate steering vector towards that position
    public Vector3 Cohesion(List<GameObject> animals)
    {
        Vector3 sum = new Vector3(); // Start with empty vector to accumulate all positions
        int count = 0;

        foreach (GameObject obj in animals)
        {
            Animal other = obj.GetComponent<Animal>();
            float dist = Vector3.Distance(position, other.position);
            if (dist > 0 && dist < detectionRadius)
            {
                sum += other.position;
                count++;
            }
        }
        if (count > 0)
        {
            sum /= count;
            return Seek(sum);  // Steer towards the position
        }
        else
        {
            return new Vector3();
        }
    }

    public void seekTarget(List<GameObject> animals, Vector3 aim)
    {
        Vector3 seperateForce = Separate(animals);
        Vector3 seekForce = Seek(aim);
        seperateForce *= 2;
        seekForce *= 1;
        ApplyForce(seperateForce);
        ApplyForce(seekForce);
    }
    public void flock(List<GameObject> animals)
    {
        // get the direction vector for all required behavior
        Vector3 sep = Separate(animals);   // Separation
        Vector3 ali = Align(animals);      // Alignment
        Vector3 coh = Cohesion(animals);   // Cohesion

        // We accumulate a new acceleration each time based on three rules
        float behaveSepare = 1.5f;    // Separation
        float behaveAlign = 1.0f;      // Alignment
        float behaveCohesion = 1.0f;  // Cohesion
        sep *= behaveSepare;
        ali *= behaveAlign;
        coh *= behaveCohesion;
        // Add the force vectors to acceleration
        ApplyForce(sep);
        ApplyForce(ali);
        ApplyForce(coh);
    }
    
    public void interact(List<GameObject> animals, float separe, float align, float cohesion, float detectRadius)
    {

        detectionRadius = detectRadius;
        // get the direction vector for all required behavior
        Vector3 sep = Separate(animals);   // Separation
        Vector3 ali = Align(animals);      // Alignment
        Vector3 coh = Cohesion(animals);   // Cohesion

        // Arbitrarily weight these forces with behavior characteristics
        sep *= separe;
        ali *= align;
        coh *= cohesion;
        // Add the force vectors to acceleration
        ApplyForce(sep);
        ApplyForce(ali);
        ApplyForce(coh);
    }

    public void Follow(FlowField flow)
    {
        Vector3 desired = flow.lookup(position);
        desired = desired * maxSpeed;
        // Steering is desired minus velocity
        Vector3 steer = desired - velocity;
        steer = Vector3.ClampMagnitude(steer, maxForce);
        ApplyForce(steer);
    }
    public void Follow(Path road)
    {
        if (isDebug && debugLink == null)
        {
            debugLink = gameObject.AddComponent<Linker>();
            debugLink.lineColor = Color.blue;
        }


        //  Step 1 : predict the future location
        Vector3 predict = velocity;   
        predict = Vector3.Normalize(predict) * predictDistance; ;  //  50 frames ahead....   arbitrary value
        Vector3 predictLoc = position + predict;


        // Step 2 : Find the normal point along the path, selecting the shortest normal to select the closest path
        float worldRecord = 10000000;  // start with arbitrary large value
        Vector3 target = new Vector3();
        Vector3 normalPoint = new Vector3();

   
        if (road.pointList.Count > 1)
        {
            for(int i = 0; i < road.pointList.Count -1; i++)
            {
                Vector3 a = road.pointList[i].transform.position;
                Vector3 b = road.pointList[i +1].transform.position; ;
                normalPoint = getNormalPoint(predictLoc, a, b);
                // This only works because we know our path goes from left to right
                // We could have a more sophisticated test to tell if the point is in the line segment or not
                if (normalPoint.x < a.x || normalPoint.x > b.x)
                {
                    // This is something of a hacky solution, but if it's not within the line segment
                    // consider the normal to just be the end of the line segment (point b)
                    normalPoint = b;
                }

                float dist = Vector3.Distance(predictLoc, normalPoint);
                if (dist < worldRecord)
                {
                    worldRecord = dist;

                    // Step 3 : Move a little further along the path and set a target
                    Vector3 dir = b - a;
                    dir.Normalize();
                    dir *= 10;  //  this is oversimplified. should be based on distance to path & velocity
                    target = normalPoint + dir;

                    if (isDebug)
                    {
                        debugLink.SetStart(predictLoc);
                        debugLink.SetEnd(normalPoint);
                    }
                }  
            }

            // Step 4 : if we are on the path, seek that target in order to stay on the path.
            if (worldRecord > road.radius)
            {
                Seek(target);

                if (isDebug)
                    debugLink.SetTarget(target, Color.red);

            } else if(isDebug)
                debugLink.SetTarget(target, Color.green);

        }
    }


    // A function to get the normal point from a point (p) to a line segment (a-b)
    // This function could be optimized to make fewer new Vector objects
    Vector3 getNormalPoint(Vector3 p, Vector3 a, Vector3 b)
    {
        // Vector from a to p  ==  projected destination vector
        Vector3 ap = p - a;
        // Vector from a to b  ==   path vector
        Vector3 ab = b - a;
        ab.Normalize(); // Normalize the line
        ab  = ab * Vector3.Dot(ap, ab);
        Vector3 normalPoint = a + ab;

       // Vector3 left = Vector3.Cross(ab, Vector3.up).normalized;
        return normalPoint;
    }

    //  Various technique instead of getNormalPoint....
    /*
    static public float GetDistPointToLine(Vector3 point, Vector3 origin, Vector3 direction)
    {
        Vector3 point2origin = origin - point;
        Vector3 point2closestPointOnLine = point2origin - Vector3.Dot(point2origin, direction) * direction;
        return point2closestPointOnLine.magnitude;

        
    }
    Vector3 Closest(Vector3 point, Vector3 origin, Vector3 direction)
    {
        return Vector3.Project((point - origin), (direction - origin)) + origin;
    }

    */

public void CheckEdges(int areaWidth, int areaLength)  //  TODO : ajouter un mode Bounce ou reapparait other side
    {

        //   When it reaches one edge, set location to the other.
        if (position.x > areaWidth)
        {
            position.x = 0;
        }
        else if (position.x < 0)
        {
            position.x = areaWidth;
        }

        if (position.z > areaLength)
        {
            position.z = 0;
        }
        else if (position.z < 0)
        {
            position.z = areaLength;
        }

    }
}
