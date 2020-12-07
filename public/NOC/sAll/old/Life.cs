using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class Life : MonoBehaviour {



    public float mutationRate = 0.01f;
    public int totalPopulation = 200;
    public string target = "To be or not"; //    Target phrase
    public string bestPhrase = "";
    public float avgFitness = 0;
    public float evolutionTime = 0;
    public int MaxFitness;
    public int SumFitness;
    public bool evolved = false;
    public int worldRecord = 0;
    public int perfectScore;

    List<string> top50;

    public int nbrGeneration = 0;

    Population genPop;
    public Text DNAsText;

    // Use this for initialization
    void Start () {
        genPop = new Population(target, mutationRate, totalPopulation);
        //DNAsText = GetComponent<Text>();

        perfectScore = (int)Mathf.Pow(2, target.Length);  //  compare to exponential increase of fitness

        top50 = new List<string>();

    }
	
	// Update is called once per frame
	void Update () {

        if(!evolved)  { 
            genPop.calculateFitness();
            genPop.Reproduce();
            avgFitness = genPop.getAverageFitness(); 
            nbrGeneration = genPop.generations;
            evolutionTime = Time.fixedTime;
            MaxFitness = genPop.getMaxFitness();
            bestPhrase = genPop.getBest();
            SumFitness = genPop.getSumFitness();   // info display

            if (MaxFitness > worldRecord)   {
                worldRecord = MaxFitness;
                top50.Insert(0, bestPhrase);
                //top50[count] = bestPhrase;
                //count++;
                //if (count >= 50) count = 0;
            }
            if (MaxFitness >= perfectScore)   {
                evolved = true;
            }
        }


        int displayLimit = Mathf.Min(top50.Count, 50);
        string s = "";
        for (int i =0; i< displayLimit; i++)
        {
            s = s + i + ". " + top50[i] + "\n"; 
        }

        DNAsText.text = "" + s;
      

    }
}
